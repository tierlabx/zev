package evaluator

import (
	"context"
	"testing"

	"zev-go/modules/agent/engine/provider"
)

type stubJudge struct{ reply string }

func (s *stubJudge) Chat(_ context.Context, _ provider.ChatRequest) (*provider.ChatResponse, error) {
	return &provider.ChatResponse{Content: s.reply}, nil
}
func (s *stubJudge) ChatStream(ctx context.Context, req provider.ChatRequest, _ func(provider.StreamChunk) error) (*provider.ChatResponse, error) {
	return s.Chat(ctx, req)
}
func (s *stubJudge) Ping(_ context.Context, _ string) (int64, error) { return 1, nil }

func TestEvaluateDeterministicAndJudge(t *testing.T) {
	spec := CaseSpec{
		Input:              "返回当前用户统计",
		ExpectedPattern:    `total`,
		ExpectedJSONSchema: `{"required":["total","ok"],"properties":{"total":{"type":"number"},"ok":{"type":"boolean"}}}`,
		JudgeCriteria:      "回答准确包含 JSON 结构",
	}
	out := Evaluate(context.Background(), spec, "```json\n{\"total\": 12, \"ok\": true}\n```", &stubJudge{
		reply: `{"score":0.95,"passed":true,"reason":"结构完整且清晰"}`,
	}, "judge-model")
	if !out.Passed || out.Score < 0.9 {
		t.Fatalf("expected passed evaluation, got %+v", out)
	}

	failOut := Evaluate(context.Background(), spec, `{"total":"not_number"}`, nil, "")
	if failOut.Passed {
		t.Fatalf("expected schema failure, got %+v", failOut)
	}
}
