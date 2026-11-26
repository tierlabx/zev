package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestOpenAIClientStreamAndToolCall(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		chunks := []string{
			`{"choices":[{"delta":{"content":"正在查询"}}]}`,
			`{"choices":[{"delta":{"content":"用户信息"}}]}`,
			`{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"system_query_users","arguments":"{\"keyword\":"}}]}}]}`,
			`{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"admin\"}"}}]},"finish_reason":"tool_calls"}]}`,
			`{"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":8,"total_tokens":20}}`,
		}
		for _, ch := range chunks {
			_, _ = fmt.Fprintf(w, "data: %s\n\n", ch)
		}
		_, _ = fmt.Fprint(w, "data: [DONE]\n\n")
	}))
	defer srv.Close()

	client, err := NewClient(Config{
		ProviderType: TypeOpenAI,
		BaseURL:      srv.URL,
		APIKey:       "test-key",
		TimeoutSec:   10,
	})
	if err != nil {
		t.Fatalf("NewClient failed: %v", err)
	}

	var streamed strings.Builder
	res, err := client.ChatStream(context.Background(), ChatRequest{
		Model:    "gpt-4o-mini",
		Messages: []Message{{Role: "user", Content: "查一下 admin"}},
	}, func(chunk StreamChunk) error {
		streamed.WriteString(chunk.DeltaContent)
		return nil
	})
	if err != nil {
		t.Fatalf("ChatStream failed: %v", err)
	}
	if streamed.String() != "正在查询用户信息" || res.Content != "正在查询用户信息" {
		t.Fatalf("unexpected content: %q / %q", streamed.String(), res.Content)
	}
	if len(res.ToolCalls) != 1 || res.ToolCalls[0].Name != "system_query_users" || res.ToolCalls[0].Arguments != `{"keyword":"admin"}` {
		t.Fatalf("unexpected tool calls: %+v", res.ToolCalls)
	}
	if res.Usage.TotalTokens != 20 {
		t.Fatalf("unexpected usage: %+v", res.Usage)
	}
}

func TestResilientClientRetryOn500(t *testing.T) {
	var attempts atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := attempts.Add(1)
		if n < 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("temporary error"))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{{
				"finish_reason": "stop",
				"message":       map[string]any{"content": "ok"},
			}},
			"usage": map[string]any{"prompt_tokens": 2, "completion_tokens": 1, "total_tokens": 3},
		})
	}))
	defer srv.Close()

	client := &resilientClient{
		inner:      NewOpenAIClient(Config{BaseURL: srv.URL, TimeoutSec: 5}),
		breaker:    &circuitBreaker{threshold: 5},
		maxRetries: 2,
		baseDelay:  1,
	}
	res, err := client.Chat(context.Background(), ChatRequest{
		Model:    "test",
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err != nil {
		t.Fatalf("expected retry success, got: %v", err)
	}
	if res.Content != "ok" || attempts.Load() != 2 {
		t.Fatalf("unexpected result %q attempts=%d", res.Content, attempts.Load())
	}
}

func TestAnthropicAndGeminiAdapters(t *testing.T) {
	anthSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"stop_reason": "end_turn",
			"content":     []map[string]any{{"type": "text", "text": "hello from claude"}},
			"usage":       map[string]any{"input_tokens": 5, "output_tokens": 4},
		})
	}))
	defer anthSrv.Close()

	anthClient, err := NewClient(Config{ProviderType: TypeAnthropic, BaseURL: anthSrv.URL, APIKey: "k"})
	if err != nil {
		t.Fatalf("anthropic NewClient failed: %v", err)
	}
	anthRes, err := anthClient.Chat(context.Background(), ChatRequest{Model: "claude-3-7", Messages: []Message{{Role: "user", Content: "hi"}}})
	if err != nil || anthRes.Content != "hello from claude" || anthRes.Usage.TotalTokens != 9 {
		t.Fatalf("unexpected anthropic response: %+v err=%v", anthRes, err)
	}

	gemSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"candidates": []map[string]any{{
				"finishReason": "STOP",
				"content": map[string]any{
					"parts": []map[string]any{{"text": "hello from gemini"}},
				},
			}},
			"usageMetadata": map[string]any{"promptTokenCount": 3, "candidatesTokenCount": 4, "totalTokenCount": 7},
		})
	}))
	defer gemSrv.Close()

	gemClient, err := NewClient(Config{ProviderType: TypeGemini, BaseURL: gemSrv.URL, APIKey: "k"})
	if err != nil {
		t.Fatalf("gemini NewClient failed: %v", err)
	}
	gemRes, err := gemClient.Chat(context.Background(), ChatRequest{Model: "gemini-2.5-flash", Messages: []Message{{Role: "user", Content: "hi"}}})
	if err != nil || gemRes.Content != "hello from gemini" || gemRes.Usage.TotalTokens != 7 {
		t.Fatalf("unexpected gemini response: %+v err=%v", gemRes, err)
	}
}

func TestAnthropicAndGeminiTrueStreamingAndToolMerge(t *testing.T) {
	var anthRoleSequence []string
	anthSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Stream   bool `json:"stream"`
			Messages []struct {
				Role    string `json:"role"`
				Content any    `json:"content"`
			} `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if !body.Stream {
			t.Fatalf("expected stream=true")
		}
		for _, m := range body.Messages {
			anthRoleSequence = append(anthRoleSequence, m.Role)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = fmt.Fprint(w, "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":10}}}\n\n")
		_, _ = fmt.Fprint(w, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"thinking_delta\",\"thinking\":\"思考中\"}}\n\n")
		_, _ = fmt.Fprint(w, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":1,\"delta\":{\"type\":\"text_delta\",\"text\":\"结论\"}}\n\n")
		_, _ = fmt.Fprint(w, "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":2,\"content_block\":{\"type\":\"tool_use\",\"id\":\"tu_1\",\"name\":\"echo\"}}\n\n")
		_, _ = fmt.Fprint(w, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":2,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"{\\\"x\\\":1}\"}}\n\n")
		_, _ = fmt.Fprint(w, "event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"tool_use\"},\"usage\":{\"output_tokens\":6}}\n\n")
	}))
	defer anthSrv.Close()

	anthClient, _ := NewClient(Config{ProviderType: TypeAnthropic, BaseURL: anthSrv.URL, APIKey: "k"})
	var anthReason, anthText strings.Builder
	anthRes, err := anthClient.ChatStream(context.Background(), ChatRequest{
		Model: "claude-3-7",
		Messages: []Message{
			{Role: "user", Content: "查两条"},
			{Role: "assistant", ToolCalls: []ToolCall{{ID: "t1", Name: "a", Arguments: "{}"}, {ID: "t2", Name: "b", Arguments: "{}"}}},
			{Role: "tool", ToolCallID: "t1", Content: "r1"},
			{Role: "tool", ToolCallID: "t2", Content: "r2"},
		},
	}, func(ch StreamChunk) error {
		anthReason.WriteString(ch.DeltaReasoning)
		anthText.WriteString(ch.DeltaContent)
		return nil
	})
	if err != nil {
		t.Fatalf("anthropic ChatStream failed: %v", err)
	}
	if strings.Join(anthRoleSequence, ",") != "user,assistant,user" {
		t.Fatalf("expected merged user tool_result role sequence, got %v", anthRoleSequence)
	}
	if anthReason.String() != "思考中" || anthText.String() != "结论" || len(anthRes.ToolCalls) != 1 || anthRes.ToolCalls[0].Arguments != `{"x":1}` {
		t.Fatalf("unexpected anthropic stream result: reason=%q text=%q res=%+v", anthReason.String(), anthText.String(), anthRes)
	}

	gemSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.URL.Path, ":streamGenerateContent") || r.URL.Query().Get("alt") != "sse" {
			t.Fatalf("expected streamGenerateContent?alt=sse, got %s", r.URL.String())
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = fmt.Fprint(w, "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"先分析\",\"thought\":true}]}}]}\n\n")
		_, _ = fmt.Fprint(w, "data: {\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"答案\"}]}}],\"usageMetadata\":{\"promptTokenCount\":4,\"candidatesTokenCount\":5,\"totalTokenCount\":9}}\n\n")
	}))
	defer gemSrv.Close()

	gemClient, _ := NewClient(Config{ProviderType: TypeGemini, BaseURL: gemSrv.URL, APIKey: "k"})
	var gemReason, gemText strings.Builder
	gemRes, err := gemClient.ChatStream(context.Background(), ChatRequest{
		Model:    "gemini-2.5-flash",
		Messages: []Message{{Role: "user", Content: "hi"}},
	}, func(ch StreamChunk) error {
		gemReason.WriteString(ch.DeltaReasoning)
		gemText.WriteString(ch.DeltaContent)
		return nil
	})
	if err != nil {
		t.Fatalf("gemini ChatStream failed: %v", err)
	}
	if gemReason.String() != "先分析" || gemText.String() != "答案" || gemRes.Usage.TotalTokens != 9 {
		t.Fatalf("unexpected gemini stream result: reason=%q text=%q res=%+v", gemReason.String(), gemText.String(), gemRes)
	}
}
