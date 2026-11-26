package guardrail

import (
	"strings"
	"testing"
)

func TestGuardrailInputOutputAndToolPolicy(t *testing.T) {
	eng := NewEngine(Policy{
		EnablePIIFilter:       true,
		BlockedKeywords:       []string{"drop table"},
		RequireHighRiskReview: true,
		RequireApprovalTools:  []string{"custom_write"},
		MaxInputRunes:         200,
		MaxOutputRunes:        100,
	})

	blocked := eng.CheckInput("请帮我执行 DROP TABLE users")
	if blocked.Allowed {
		t.Fatal("expected keyword to be blocked")
	}

	sanitized := eng.CheckInput("我的手机号是 13812345678，密钥是 sk-1234567890abcdef")
	if !sanitized.Allowed || !sanitized.Modified {
		t.Fatalf("expected sanitized allowed result, got %+v", sanitized)
	}
	if strings.Contains(sanitized.Sanitized, "13812345678") || strings.Contains(sanitized.Sanitized, "sk-1234567890abcdef") {
		t.Fatalf("sensitive info leaked: %q", sanitized.Sanitized)
	}

	tcDenied := eng.CheckToolCall("not_in_list", `{}`, RiskLow, []string{"system_query_users"})
	if tcDenied.Allowed {
		t.Fatal("expected tool outside whitelist to be denied")
	}

	tcApproval := eng.CheckToolCall("system_send_notice_draft", `{"password":"abc","title":"hi"}`, RiskHigh, []string{"system_send_notice_draft"})
	if !tcApproval.Allowed || !tcApproval.RequireApproval {
		t.Fatalf("expected high risk tool to require approval, got %+v", tcApproval)
	}
	if strings.Contains(tcApproval.SanitizedArgs, `"abc"`) {
		t.Fatalf("expected password in tool args to be masked, got %q", tcApproval.SanitizedArgs)
	}
}
