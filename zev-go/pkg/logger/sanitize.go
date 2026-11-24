package logger

import (
	"bytes"
	"encoding/json"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"unicode/utf8"
)

// MaskedValue 敏感字段脱敏占位符
const MaskedValue = "***"

var exactSensitiveKeys = map[string]struct{}{
	"password":         {},
	"old_password":     {},
	"new_password":     {},
	"confirm_password": {},
	"passwd":           {},
	"pwd":              {},
	"token":            {},
	"access_token":     {},
	"refresh_token":    {},
	"authorization":    {},
	"secret":           {},
	"app_secret":       {},
	"api_key":          {},
	"apikey":           {},
	"private_key":      {},
	"cookie":           {},
	"set-cookie":       {},
	"session":          {},
	"credential":       {},
}

var sensitiveKeyFragments = []string{
	"password",
	"passwd",
	"secret",
	"token",
	"private_key",
	"credential",
	"authorization",
}

var plainSecretRegex = regexp.MustCompile(`(?i)\b(password|passwd|pwd|token|access_token|refresh_token|secret|api_key|authorization)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s&,;]+)`)

func isSensitiveKey(key string) bool {
	lower := strings.ToLower(strings.TrimSpace(key))
	if lower == "" {
		return false
	}
	if _, ok := exactSensitiveKeys[lower]; ok {
		return true
	}
	for _, frag := range sensitiveKeyFragments {
		if strings.Contains(lower, frag) {
			return true
		}
	}
	return false
}

func sanitizeValue(val any) any {
	switch v := val.(type) {
	case map[string]any:
		res := make(map[string]any, len(v))
		for k, item := range v {
			if isSensitiveKey(k) {
				res[k] = MaskedValue
				continue
			}
			res[k] = sanitizeValue(item)
		}
		return res
	case []any:
		res := make([]any, len(v))
		for i, item := range v {
			res[i] = sanitizeValue(item)
		}
		return res
	default:
		return val
	}
}

// SanitizeJSON 递归脱敏 JSON 字符串中的敏感字段，并按最大字节数安全截断
func SanitizeJSON(raw []byte, maxBytes int) string {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 {
		return ""
	}

	var parsed any
	if err := json.Unmarshal(trimmed, &parsed); err == nil {
		sanitized := sanitizeValue(parsed)
		var buf bytes.Buffer
		enc := json.NewEncoder(&buf)
		enc.SetEscapeHTML(false)
		if err := enc.Encode(sanitized); err == nil {
			out := strings.TrimRight(buf.String(), "\r\n")
			return TruncateString(out, maxBytes)
		}
	}

	// 非合法 JSON 时仍对常见 key=value / Authorization 等凭据片段兜底脱敏
	masked := plainSecretRegex.ReplaceAllString(string(trimmed), "$1$2"+MaskedValue)
	return TruncateString(masked, maxBytes)
}

// SanitizeQuery 脱敏 URL Query 参数并保持按键有序输出
func SanitizeQuery(rawQuery string, maxBytes int) string {
	trimmed := strings.TrimSpace(rawQuery)
	if trimmed == "" {
		return ""
	}

	values, err := url.ParseQuery(trimmed)
	if err != nil {
		masked := plainSecretRegex.ReplaceAllString(trimmed, "$1$2"+MaskedValue)
		return TruncateString(masked, maxBytes)
	}

	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		if isSensitiveKey(k) {
			parts = append(parts, url.QueryEscape(k)+"="+MaskedValue)
			continue
		}
		for _, val := range values[k] {
			parts = append(parts, url.QueryEscape(k)+"="+url.QueryEscape(val))
		}
	}
	return TruncateString(strings.Join(parts, "&"), maxBytes)
}

// TruncateString 在合法 UTF-8 字符边界上截断字符串，避免产生乱码
func TruncateString(s string, maxBytes int) string {
	if maxBytes <= 0 || len(s) <= maxBytes {
		return s
	}
	const suffix = "...(truncated)"
	limit := maxBytes
	for limit > 0 && !utf8.RuneStart(s[limit]) {
		limit--
	}
	return s[:limit] + suffix
}

// ParseUserAgent 轻量解析 User-Agent 获取浏览器和操作系统名称（零第三方依赖）
func ParseUserAgent(ua string) (browser, osName string) {
	ua = strings.TrimSpace(ua)
	if ua == "" {
		return "Unknown", "Unknown"
	}

	switch {
	case strings.Contains(ua, "Windows"):
		osName = "Windows"
	case strings.Contains(ua, "Android"):
		osName = "Android"
	case strings.Contains(ua, "iPhone"), strings.Contains(ua, "iPad"), strings.Contains(ua, "iPod"):
		osName = "iOS"
	case strings.Contains(ua, "Mac OS X"), strings.Contains(ua, "Macintosh"):
		osName = "macOS"
	case strings.Contains(ua, "Linux"):
		osName = "Linux"
	case strings.Contains(ua, "PostmanRuntime"), strings.Contains(ua, "curl/"), strings.Contains(ua, "Go-http-client"):
		osName = "CLI/API"
	default:
		osName = "Unknown"
	}

	switch {
	case strings.Contains(ua, "Edg/"), strings.Contains(ua, "Edge/"):
		browser = "Edge"
	case strings.Contains(ua, "OPR/"), strings.Contains(ua, "Opera"):
		browser = "Opera"
	case strings.Contains(ua, "MicroMessenger"):
		browser = "WeChat"
	case strings.Contains(ua, "Firefox/"):
		browser = "Firefox"
	case strings.Contains(ua, "Chrome/"), strings.Contains(ua, "CriOS/"):
		browser = "Chrome"
	case strings.Contains(ua, "Safari/"):
		browser = "Safari"
	case strings.Contains(ua, "PostmanRuntime"):
		browser = "Postman"
	case strings.Contains(ua, "curl/"):
		browser = "curl"
	case strings.Contains(ua, "Go-http-client"):
		browser = "Go-HTTP"
	default:
		browser = "Unknown"
	}

	return browser, osName
}
