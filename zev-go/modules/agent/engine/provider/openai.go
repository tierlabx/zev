package provider

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

// OpenAIClient 支持 OpenAI 及其兼容协议（DeepSeek / Qwen / Moonshot / Ollama / vLLM 等）
type OpenAIClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewOpenAIClient(cfg Config) *OpenAIClient {
	base := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if base == "" {
		if cfg.ProviderType == TypeOllama {
			base = "http://localhost:11434/v1"
		} else {
			base = "https://api.openai.com/v1"
		}
	}
	timeout := time.Duration(cfg.TimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	return &OpenAIClient{
		baseURL:    base,
		apiKey:     strings.TrimSpace(cfg.APIKey),
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (c *OpenAIClient) buildPayload(req ChatRequest, stream bool) map[string]any {
	msgs := make([]map[string]any, 0, len(req.Messages))
	for _, m := range req.Messages {
		item := map[string]any{
			"role":    m.Role,
			"content": m.Content,
		}
		if m.Role == "tool" && m.ToolCallID != "" {
			item["tool_call_id"] = m.ToolCallID
		}
		if len(m.ToolCalls) > 0 {
			tcs := make([]map[string]any, 0, len(m.ToolCalls))
			for _, tc := range m.ToolCalls {
				args := tc.Arguments
				if strings.TrimSpace(args) == "" {
					args = "{}"
				}
				tcs = append(tcs, map[string]any{
					"id":   tc.ID,
					"type": "function",
					"function": map[string]any{
						"name":      tc.Name,
						"arguments": args,
					},
				})
			}
			item["tool_calls"] = tcs
		}
		msgs = append(msgs, item)
	}

	payload := map[string]any{
		"model":       req.Model,
		"messages":    msgs,
		"temperature": req.Temperature,
		"stream":      stream,
	}
	if req.MaxTokens > 0 {
		payload["max_tokens"] = req.MaxTokens
	}
	if stream {
		payload["stream_options"] = map[string]any{"include_usage": true}
	}
	if len(req.Tools) > 0 {
		tools := make([]map[string]any, 0, len(req.Tools))
		for _, t := range req.Tools {
			params := t.Parameters
			if params == nil {
				params = map[string]any{"type": "object", "properties": map[string]any{}}
			}
			tools = append(tools, map[string]any{
				"type": "function",
				"function": map[string]any{
					"name":        t.Name,
					"description": t.Description,
					"parameters":  params,
				},
			})
		}
		payload["tools"] = tools
	}
	return payload
}

func (c *OpenAIClient) doRequest(ctx context.Context, path string, body any) (*http.Response, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		defer resp.Body.Close()
		errBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, &HTTPStatusError{StatusCode: resp.StatusCode, Body: strings.TrimSpace(string(errBody))}
	}
	return resp, nil
}

func (c *OpenAIClient) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	resp, err := c.doRequest(ctx, "/chat/completions", c.buildPayload(req, false))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var decoded struct {
		Choices []struct {
			FinishReason string `json:"finish_reason"`
			Message      struct {
				Content          string `json:"content"`
				ReasoningContent string `json:"reasoning_content"`
				ToolCalls        []struct {
					ID       string `json:"id"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
		Usage Usage `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	if len(decoded.Choices) == 0 {
		return nil, errors.New("模型返回空候选列表")
	}

	choice := decoded.Choices[0]
	out := &ChatResponse{
		Content:          choice.Message.Content,
		ReasoningContent: choice.Message.ReasoningContent,
		Usage:            decoded.Usage,
		FinishReason:     choice.FinishReason,
	}
	for _, tc := range choice.Message.ToolCalls {
		out.ToolCalls = append(out.ToolCalls, ToolCall{
			ID:        tc.ID,
			Name:      tc.Function.Name,
			Arguments: tc.Function.Arguments,
		})
	}
	fillEstimatedUsage(&out.Usage, req.Messages, out.Content)
	return out, nil
}

func (c *OpenAIClient) ChatStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk) error) (*ChatResponse, error) {
	resp, err := c.doRequest(ctx, "/chat/completions", c.buildPayload(req, true))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)

	var contentBuf strings.Builder
	var reasoningBuf strings.Builder
	toolMap := make(map[int]*ToolCall)
	var usage Usage
	var finishReason string

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}

		var chunk struct {
			Choices []struct {
				FinishReason string `json:"finish_reason"`
				Delta        struct {
					Content          string `json:"content"`
					ReasoningContent string `json:"reasoning_content"`
					ToolCalls        []struct {
						Index    int    `json:"index"`
						ID       string `json:"id"`
						Function struct {
							Name      string `json:"name"`
							Arguments string `json:"arguments"`
						} `json:"function"`
					} `json:"tool_calls"`
				} `json:"delta"`
			} `json:"choices"`
			Usage *Usage `json:"usage"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if chunk.Usage != nil && chunk.Usage.TotalTokens > 0 {
			usage = *chunk.Usage
		}
		if len(chunk.Choices) == 0 {
			continue
		}
		ch := chunk.Choices[0]
		if ch.FinishReason != "" {
			finishReason = ch.FinishReason
		}
		if ch.Delta.ReasoningContent != "" {
			reasoningBuf.WriteString(ch.Delta.ReasoningContent)
			if onChunk != nil {
				if err := onChunk(StreamChunk{DeltaReasoning: ch.Delta.ReasoningContent}); err != nil {
					return nil, err
				}
			}
		}
		if ch.Delta.Content != "" {
			contentBuf.WriteString(ch.Delta.Content)
			if onChunk != nil {
				if err := onChunk(StreamChunk{DeltaContent: ch.Delta.Content}); err != nil {
					return nil, err
				}
			}
		}
		for _, tc := range ch.Delta.ToolCalls {
			acc, exists := toolMap[tc.Index]
			if !exists {
				acc = &ToolCall{}
				toolMap[tc.Index] = acc
			}
			if tc.ID != "" {
				acc.ID = tc.ID
			}
			if tc.Function.Name != "" {
				acc.Name += tc.Function.Name
			}
			if tc.Function.Arguments != "" {
				acc.Arguments += tc.Function.Arguments
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	indices := make([]int, 0, len(toolMap))
	for idx := range toolMap {
		indices = append(indices, idx)
	}
	sort.Ints(indices)
	toolCalls := make([]ToolCall, 0, len(indices))
	for i, idx := range indices {
		tc := *toolMap[idx]
		if tc.ID == "" {
			tc.ID = fmt.Sprintf("call_%d", i+1)
		}
		toolCalls = append(toolCalls, tc)
	}

	out := &ChatResponse{
		Content:          contentBuf.String(),
		ReasoningContent: reasoningBuf.String(),
		ToolCalls:        toolCalls,
		Usage:            usage,
		FinishReason:     finishReason,
	}
	fillEstimatedUsage(&out.Usage, req.Messages, out.Content)
	if onChunk != nil {
		_ = onChunk(StreamChunk{ToolCalls: toolCalls, Usage: &out.Usage, FinishReason: finishReason, Done: true})
	}
	return out, nil
}

func (c *OpenAIClient) Ping(ctx context.Context, model string) (int64, error) {
	started := time.Now()
	// 优先探测 /models 接口避免产生额外推理计费；部分兼容代理未实现 /models 时回退轻量 chat
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/models", nil)
	if err != nil {
		return 0, err
	}
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
	resp, err := c.httpClient.Do(req)
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return time.Since(started).Milliseconds(), nil
		}
		if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			errBody, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
			return time.Since(started).Milliseconds(), &HTTPStatusError{StatusCode: resp.StatusCode, Body: string(errBody)}
		}
	}

	_, err = c.Chat(ctx, ChatRequest{
		Model:     model,
		Messages:  []Message{{Role: "user", Content: "ping"}},
		MaxTokens: 4,
	})
	return time.Since(started).Milliseconds(), err
}

func fillEstimatedUsage(usage *Usage, msgs []Message, output string) {
	if usage.TotalTokens > 0 {
		return
	}
	prompt := 0
	for _, m := range msgs {
		prompt += EstimateTokens(m.Content)
	}
	comp := EstimateTokens(output)
	usage.PromptTokens = prompt
	usage.CompletionTokens = comp
	usage.TotalTokens = prompt + comp
}
