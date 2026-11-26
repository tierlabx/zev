package runtime

import (
	"context"
	"strings"
	"testing"
	"time"

	"zev-go/modules/agent/engine/guardrail"
	"zev-go/modules/agent/engine/provider"
	"zev-go/modules/agent/engine/tool"
)

type scriptProvider struct {
	steps []*provider.ChatResponse
	idx   int
}

func (s *scriptProvider) Chat(_ context.Context, _ provider.ChatRequest) (*provider.ChatResponse, error) {
	if s.idx >= len(s.steps) {
		return &provider.ChatResponse{Content: "done", Usage: provider.Usage{TotalTokens: 10}}, nil
	}
	res := s.steps[s.idx]
	s.idx++
	return res, nil
}

func (s *scriptProvider) ChatStream(ctx context.Context, req provider.ChatRequest, onChunk func(provider.StreamChunk) error) (*provider.ChatResponse, error) {
	res, err := s.Chat(ctx, req)
	if err != nil {
		return nil, err
	}
	if onChunk != nil {
		if res.ReasoningContent != "" {
			_ = onChunk(provider.StreamChunk{DeltaReasoning: res.ReasoningContent})
		}
		if res.Content != "" {
			_ = onChunk(provider.StreamChunk{DeltaContent: res.Content})
		}
	}
	return res, nil
}

func (s *scriptProvider) Ping(_ context.Context, _ string) (int64, error) { return 1, nil }

func TestRunnerToolApprovalFlowAndSpans(t *testing.T) {
	reg := tool.NewRegistry()
	executed := false
	reg.Register(tool.NewFuncTool(tool.Meta{
		Name:      "system_send_notice_draft",
		RiskLevel: guardrail.RiskHigh,
	}, func(_ context.Context, args map[string]any) (string, error) {
		executed = true
		return `{"created":true}`, nil
	}))

	broker := NewApprovalBroker()
	mockLLM := &scriptProvider{
		steps: []*provider.ChatResponse{
			{
				ToolCalls: []provider.ToolCall{{ID: "c1", Name: "system_send_notice_draft", Arguments: `{"title":"维护"}`}},
				Usage:     provider.Usage{PromptTokens: 20, CompletionTokens: 10, TotalTokens: 30},
			},
			{
				Content: "通知草稿已创建完成。",
				Usage:   provider.Usage{PromptTokens: 25, CompletionTokens: 15, TotalTokens: 40},
			},
		},
	}

	var spans []SpanRecord
	var events []Event
	res := Execute(context.Background(), RunConfig{
		RunID:           42,
		Model:           "mock-model",
		UserInput:       "帮我发一个系统维护草稿",
		MaxSteps:        5,
		MaxTokensBudget: 1000,
		ToolWhitelist:   []string{"system_send_notice_draft"},
		ApprovalTimeout: 5 * time.Second,
		Client:          mockLLM,
		Tools:           reg,
		Guardrail:       guardrail.NewEngine(guardrail.DefaultPolicy()),
		Broker:          broker,
		OnEvent: func(e Event) {
			events = append(events, e)
		},
		OnSpan: func(sp SpanRecord) {
			spans = append(spans, sp)
		},
		OnRequestApproval: func(_ context.Context, info ApprovalRequestInfo) (uint, any, error) {
			// 模拟管理员在 20ms 后点击审批通过
			go func() {
				time.Sleep(20 * time.Millisecond)
				broker.Resolve(ApprovalDecision{ApprovalID: 99, Approved: true, Approver: "admin", Comment: "同意"})
			}()
			return 99, map[string]any{"id": 99, "tool_name": info.ToolName}, nil
		},
	})

	if res.Status != "completed" || !executed {
		t.Fatalf("expected completed run with executed tool, got status=%s executed=%v err=%s", res.Status, executed, res.ErrorMessage)
	}
	if res.TotalTokens != 70 || res.StepCount != 2 {
		t.Fatalf("unexpected metrics: tokens=%d steps=%d", res.TotalTokens, res.StepCount)
	}
	hasApprovalSpan := false
	for _, sp := range spans {
		if sp.SpanType == "approval" && sp.Status == "ok" {
			hasApprovalSpan = true
		}
	}
	if !hasApprovalSpan {
		t.Fatalf("expected approval span in %+v", spans)
	}
}

func TestRunnerBudgetCircuitBreak(t *testing.T) {
	mockLLM := &scriptProvider{
		steps: []*provider.ChatResponse{
			{
				ToolCalls: []provider.ToolCall{{ID: "c1", Name: "echo", Arguments: `{}`}},
				Usage:     provider.Usage{TotalTokens: 500},
			},
		},
	}
	reg := tool.NewRegistry()
	reg.Register(tool.NewFuncTool(tool.Meta{Name: "echo", RiskLevel: guardrail.RiskLow}, func(_ context.Context, _ map[string]any) (string, error) {
		return "ok", nil
	}))
	res := Execute(context.Background(), RunConfig{
		Model:           "mock",
		UserInput:       "loop",
		MaxSteps:        5,
		MaxTokensBudget: 400,
		ToolWhitelist:   []string{"echo"},
		Client:          mockLLM,
		Tools:           reg,
	})
	if res.Status != "failed" || !strings.Contains(res.ErrorMessage, "预算上限") {
		t.Fatalf("expected budget circuit break, got status=%s err=%q", res.Status, res.ErrorMessage)
	}
}

func TestApprovalBrokerResolveBeforeWait(t *testing.T) {
	broker := NewApprovalBroker()
	ok := broker.Resolve(ApprovalDecision{
		ApprovalID: 77,
		Approved:   true,
		Approver:   "admin",
		Comment:    "fast-approve",
	})
	if !ok {
		t.Fatal("expected Resolve before Wait to succeed")
	}
	decision, err := broker.Wait(context.Background(), 77, time.Second)
	if err != nil {
		t.Fatalf("Wait failed: %v", err)
	}
	if !decision.Approved || decision.Comment != "fast-approve" {
		t.Fatalf("unexpected cached decision: %+v", decision)
	}
}

func TestRunnerApprovalTimeoutAndReasoningEvents(t *testing.T) {
	reg := tool.NewRegistry()
	reg.Register(tool.NewFuncTool(tool.Meta{
		Name:      "danger_op",
		RiskLevel: guardrail.RiskHigh,
	}, func(_ context.Context, _ map[string]any) (string, error) {
		return "should-not-run", nil
	}))

	broker := NewApprovalBroker()
	mockLLM := &scriptProvider{
		steps: []*provider.ChatResponse{
			{
				ReasoningContent: "先评估权限风险",
				ToolCalls:        []provider.ToolCall{{ID: "c1", Name: "danger_op", Arguments: `{}`}},
				Usage:            provider.Usage{TotalTokens: 15},
			},
			{
				Content: "审批已超时，无法继续执行。",
				Usage:   provider.Usage{TotalTokens: 12},
			},
		},
	}

	var finishedStatus string
	var gotReasoning bool
	res := Execute(context.Background(), RunConfig{
		RunID:           88,
		Model:           "mock",
		UserInput:       "执行高危操作",
		MaxSteps:        4,
		MaxTokensBudget: 1000,
		ToolWhitelist:   []string{"danger_op"},
		ApprovalTimeout: 25 * time.Millisecond,
		Client:          mockLLM,
		Tools:           reg,
		Guardrail:       guardrail.NewEngine(guardrail.DefaultPolicy()),
		Broker:          broker,
		OnEvent: func(e Event) {
			if e.Type == EventReasoning && e.Content == "先评估权限风险" {
				gotReasoning = true
			}
		},
		OnRequestApproval: func(_ context.Context, _ ApprovalRequestInfo) (uint, any, error) {
			return 108, map[string]any{"id": 108}, nil
		},
		OnApprovalFinished: func(approvalID uint, status string) {
			if approvalID == 108 {
				finishedStatus = status
			}
		},
	})

	if res.Status != "completed" {
		t.Fatalf("expected completed run after timeout feedback, got %s (%s)", res.Status, res.ErrorMessage)
	}
	if finishedStatus != "expired" {
		t.Fatalf("expected OnApprovalFinished expired, got %q", finishedStatus)
	}
	if !gotReasoning {
		t.Fatal("expected EventReasoning to be emitted")
	}
}
