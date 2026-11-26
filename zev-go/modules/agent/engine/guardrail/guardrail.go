package guardrail

import (
	"fmt"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"

	"zev-go/pkg/logger"
)

const (
	RiskLow      = "low"
	RiskMedium   = "medium"
	RiskHigh     = "high"
	RiskCritical = "critical"
)

// Policy 定义单个 Agent 的护栏与审批策略
type Policy struct {
	EnablePIIFilter       bool     `json:"enable_pii_filter"`
	BlockedKeywords       []string `json:"blocked_keywords"`
	RequireApprovalTools  []string `json:"require_approval_tools"`
	RequireHighRiskReview bool     `json:"require_high_risk_review"`
	MaxInputRunes         int      `json:"max_input_runes"`
	MaxOutputRunes        int      `json:"max_output_runes"`
}

// DefaultPolicy 返回安全的默认护栏配置
func DefaultPolicy() Policy {
	return Policy{
		EnablePIIFilter:       true,
		RequireHighRiskReview: true,
		MaxInputRunes:         8000,
		MaxOutputRunes:        16000,
	}
}

// CheckResult 表示输入/输出护栏校验结果
type CheckResult struct {
	Allowed   bool   `json:"allowed"`
	Sanitized string `json:"sanitized"`
	Reason    string `json:"reason,omitempty"`
	Modified  bool   `json:"modified,omitempty"`
}

// ToolCheckResult 表示工具调用前护栏与风险判定结果
type ToolCheckResult struct {
	Allowed         bool   `json:"allowed"`
	RequireApproval bool   `json:"require_approval"`
	RiskLevel       string `json:"risk_level"`
	Reason          string `json:"reason,omitempty"`
	SanitizedArgs   string `json:"sanitized_args"`
}

var (
	// 匹配常见 API Key / JWT / 手机号等文本凭据，配合 pkg/logger 脱敏规则防止敏感信息外泄
	bearerLikeRe = regexp.MustCompile(`(?i)\b(sk-[a-z0-9_-]{12,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b`)
	cnPhoneRe    = regexp.MustCompile(`\b(1[3-9]\d)\d{4}(\d{4})\b`)
)

// Engine 负责执行输入拦截、输出脱敏以及工具调用的风险审批判定
type Engine struct {
	policy Policy
}

func NewEngine(policy Policy) *Engine {
	if policy.MaxInputRunes <= 0 {
		policy.MaxInputRunes = 8000
	}
	if policy.MaxOutputRunes <= 0 {
		policy.MaxOutputRunes = 16000
	}
	return &Engine{policy: policy}
}

// CheckInput 校验用户输入长度、违禁词并执行脱敏
func (e *Engine) CheckInput(input string) CheckResult {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return CheckResult{Allowed: false, Reason: "输入内容不能为空"}
	}
	if utf8.RuneCountInString(trimmed) > e.policy.MaxInputRunes {
		return CheckResult{
			Allowed: false,
			Reason:  fmt.Sprintf("输入长度超过护栏上限（最多 %d 字符）", e.policy.MaxInputRunes),
		}
	}
	lower := strings.ToLower(trimmed)
	for _, kw := range e.policy.BlockedKeywords {
		k := strings.TrimSpace(kw)
		if k != "" && strings.Contains(lower, strings.ToLower(k)) {
			return CheckResult{
				Allowed: false,
				Reason:  fmt.Sprintf("输入命中护栏拦截策略（违禁词：%s）", k),
			}
		}
	}

	sanitized := trimmed
	modified := false
	if e.policy.EnablePIIFilter {
		next := SanitizeText(trimmed)
		if next != trimmed {
			sanitized = next
			modified = true
		}
	}
	return CheckResult{Allowed: true, Sanitized: sanitized, Modified: modified}
}

// CheckOutput 脱敏并裁剪模型最终回复，防止凭据泄漏或超长输出
func (e *Engine) CheckOutput(output string) CheckResult {
	sanitized := output
	modified := false
	if e.policy.EnablePIIFilter {
		next := SanitizeText(sanitized)
		if next != sanitized {
			sanitized = next
			modified = true
		}
	}
	runes := []rune(sanitized)
	if len(runes) > e.policy.MaxOutputRunes {
		sanitized = string(runes[:e.policy.MaxOutputRunes]) + "\n...(内容已按护栏上限截断)"
		modified = true
	}
	return CheckResult{Allowed: true, Sanitized: sanitized, Modified: modified}
}

// CheckToolCall 校验工具白名单、脱敏参数并决定是否需要挂起等待人工审批
func (e *Engine) CheckToolCall(toolName, rawArgs, riskLevel string, whitelist []string) ToolCheckResult {
	sanitizedArgs := logger.SanitizeJSON([]byte(rawArgs), 4096)
	if sanitizedArgs == "" {
		sanitizedArgs = "{}"
	}
	if len(whitelist) > 0 && !slices.Contains(whitelist, toolName) {
		return ToolCheckResult{
			Allowed:       false,
			RiskLevel:     riskLevel,
			Reason:        fmt.Sprintf("工具 %s 不在当前 Agent 的白名单内", toolName),
			SanitizedArgs: sanitizedArgs,
		}
	}

	if riskLevel == "" {
		riskLevel = RiskLow
	}
	if slices.Contains(e.policy.RequireApprovalTools, toolName) {
		return ToolCheckResult{
			Allowed:         true,
			RequireApproval: true,
			RiskLevel:       maxRisk(riskLevel, RiskHigh),
			Reason:          fmt.Sprintf("工具 %s 已被列入必审策略清单", toolName),
			SanitizedArgs:   sanitizedArgs,
		}
	}
	if e.policy.RequireHighRiskReview && (riskLevel == RiskHigh || riskLevel == RiskCritical) {
		return ToolCheckResult{
			Allowed:         true,
			RequireApproval: true,
			RiskLevel:       riskLevel,
			Reason:          fmt.Sprintf("工具 %s 风险等级为 %s，触发人工审批护栏", toolName, riskLevel),
			SanitizedArgs:   sanitizedArgs,
		}
	}

	return ToolCheckResult{
		Allowed:       true,
		RiskLevel:     riskLevel,
		SanitizedArgs: sanitizedArgs,
	}
}

// SanitizeText 复用 pkg/logger 脱敏规则并额外屏蔽常见密钥串与手机号
func SanitizeText(text string) string {
	if text == "" {
		return ""
	}
	masked := logger.SanitizeJSON([]byte(text), 0)
	// 若输入本身非 JSON，SanitizeJSON 会走 plainSecretRegex；若是普通纯文本则保留原始格式再脱敏密钥/手机号
	if !strings.HasPrefix(strings.TrimSpace(text), "{") && !strings.HasPrefix(strings.TrimSpace(text), "[") {
		masked = logger.SanitizeJSON([]byte(text), 0)
	}
	masked = bearerLikeRe.ReplaceAllString(masked, logger.MaskedValue)
	masked = cnPhoneRe.ReplaceAllString(masked, "${1}****${2}")
	return masked
}

func maxRisk(a, b string) string {
	rank := map[string]int{RiskLow: 1, RiskMedium: 2, RiskHigh: 3, RiskCritical: 4}
	if rank[a] >= rank[b] {
		return a
	}
	return b
}
