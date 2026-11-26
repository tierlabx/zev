package evaluator

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"zev-go/modules/agent/engine/provider"
)

// CaseSpec 描述单条评测用例的断言与可选 LLM 评判标准
type CaseSpec struct {
	Input              string
	ExpectedPattern    string
	ExpectedJSONSchema string
	JudgeCriteria      string
}

// EvalOutcome 记录单条用例评测的综合结论与评分明细
type EvalOutcome struct {
	Passed          bool    `json:"passed"`
	Score           float64 `json:"score"`
	AssertionDetail string  `json:"assertion_detail"`
	JudgeReason     string  `json:"judge_reason"`
}

// Evaluate 执行确定性断言（正则/子串 + JSON Schema 必填字段校验）与可选 LLM-as-a-Judge 评分
func Evaluate(ctx context.Context, spec CaseSpec, actualOutput string, judgeClient provider.Client, judgeModel string) EvalOutcome {
	var details []string
	deterministicOK := true

	// 1. 正则或关键词匹配断言
	pattern := strings.TrimSpace(spec.ExpectedPattern)
	if pattern != "" {
		re, err := regexp.Compile(pattern)
		if err != nil {
			// 若非合法正则，退化为不区分大小写的子串匹配
			if strings.Contains(strings.ToLower(actualOutput), strings.ToLower(pattern)) {
				details = append(details, fmt.Sprintf("子串匹配通过(%s)", pattern))
			} else {
				deterministicOK = false
				details = append(details, fmt.Sprintf("子串匹配失败：未包含 %q", pattern))
			}
		} else if re.MatchString(actualOutput) {
			details = append(details, fmt.Sprintf("正则匹配通过(%s)", pattern))
		} else {
			deterministicOK = false
			details = append(details, fmt.Sprintf("正则匹配失败：/%s/", pattern))
		}
	}

	// 2. JSON Schema 轻量结构断言（校验 JSON 合法性、required 字段及 properties 类型）
	schemaStr := strings.TrimSpace(spec.ExpectedJSONSchema)
	if schemaStr != "" {
		ok, msg := validateJSONSchema(actualOutput, schemaStr)
		if !ok {
			deterministicOK = false
		}
		details = append(details, msg)
	}

	score := 1.0
	if !deterministicOK {
		score = 0.0
	}

	// 3. 可选 LLM-as-a-Judge 语义评分
	judgeReason := ""
	criteria := strings.TrimSpace(spec.JudgeCriteria)
	if criteria != "" && judgeClient != nil && judgeModel != "" {
		jScore, jPassed, jReason, err := runLLMJudge(ctx, judgeClient, judgeModel, spec.Input, actualOutput, criteria)
		if err != nil {
			judgeReason = "LLM Judge 调用失败: " + err.Error()
		} else {
			judgeReason = jReason
			if deterministicOK {
				score = jScore
				deterministicOK = jPassed
			} else {
				score = jScore * 0.5
			}
		}
	}

	if len(details) == 0 && criteria == "" {
		if strings.TrimSpace(actualOutput) != "" {
			details = append(details, "输出非空校验通过")
		} else {
			deterministicOK = false
			score = 0
			details = append(details, "输出为空")
		}
	}

	return EvalOutcome{
		Passed:          deterministicOK,
		Score:           score,
		AssertionDetail: strings.Join(details, "；"),
		JudgeReason:     judgeReason,
	}
}

func validateJSONSchema(actualOutput, schemaStr string) (bool, string) {
	var schema struct {
		Required   []string `json:"required"`
		Properties map[string]struct {
			Type string `json:"type"`
		} `json:"properties"`
	}
	if err := json.Unmarshal([]byte(schemaStr), &schema); err != nil {
		return false, "期望 JSON Schema 配置不合法: " + err.Error()
	}

	extracted := extractJSONObject(actualOutput)
	var obj map[string]any
	if err := json.Unmarshal([]byte(extracted), &obj); err != nil {
		return false, "实际输出不是合法 JSON 对象"
	}

	for _, reqField := range schema.Required {
		if _, exists := obj[reqField]; !exists {
			return false, fmt.Sprintf("JSON 缺少必填字段 %q", reqField)
		}
	}
	for field, rule := range schema.Properties {
		val, exists := obj[field]
		if !exists || rule.Type == "" {
			continue
		}
		if !matchJSONType(val, rule.Type) {
			return false, fmt.Sprintf("JSON 字段 %q 类型不匹配，期望 %s", field, rule.Type)
		}
	}
	return true, "JSON Schema 结构校验通过"
}

// extractJSONObject 兼容模型使用 ```json ... ``` 代码块包裹 JSON 的常见输出格式
func extractJSONObject(text string) string {
	trimmed := strings.TrimSpace(text)
	if idx := strings.Index(trimmed, "{"); idx >= 0 {
		if last := strings.LastIndex(trimmed, "}"); last > idx {
			return trimmed[idx : last+1]
		}
	}
	return trimmed
}

func matchJSONType(val any, expected string) bool {
	switch strings.ToLower(expected) {
	case "string":
		_, ok := val.(string)
		return ok
	case "number", "integer":
		_, ok := val.(float64)
		return ok
	case "boolean":
		_, ok := val.(bool)
		return ok
	case "array":
		_, ok := val.([]any)
		return ok
	case "object":
		_, ok := val.(map[string]any)
		return ok
	default:
		return true
	}
}

func runLLMJudge(ctx context.Context, client provider.Client, model, input, output, criteria string) (float64, bool, string, error) {
	prompt := fmt.Sprintf(`你是一名严格的 AI 评测裁判。请根据以下评分标准评估助手回答，并仅输出 JSON 对象：{"score": 0到1之间的小数, "passed": true或false, "reason": "简短中文理由"}。

[用户输入]
%s

[助手回答]
%s

[评分标准]
%s`, input, output, criteria)

	resp, err := client.Chat(ctx, provider.ChatRequest{
		Model:       model,
		Messages:    []provider.Message{{Role: "user", Content: prompt}},
		Temperature: 0,
		MaxTokens:   256,
	})
	if err != nil {
		return 0, false, "", err
	}
	var parsed struct {
		Score  float64 `json:"score"`
		Passed bool    `json:"passed"`
		Reason string  `json:"reason"`
	}
	if err := json.Unmarshal([]byte(extractJSONObject(resp.Content)), &parsed); err != nil {
		return 0, false, resp.Content, fmt.Errorf("解析 Judge JSON 失败: %w", err)
	}
	if parsed.Score < 0 {
		parsed.Score = 0
	} else if parsed.Score > 1 {
		parsed.Score = 1
	}
	return parsed.Score, parsed.Passed, parsed.Reason, nil
}
