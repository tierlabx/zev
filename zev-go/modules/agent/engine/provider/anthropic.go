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

// AnthropicClient 适配 Anthropic Messages API (/v1/messages)
type AnthropicClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewAnthropicClient(cfg Config) *AnthropicClient {
	base := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if base == "" {
		base = "https://api.anthropic.com"
	}
	timeout := time.Duration(cfg.TimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	return &AnthropicClient{
		baseURL:    base,
		apiKey:     strings.TrimSpace(cfg.APIKey),
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (c *AnthropicClient) buildPayload(req ChatRequest, stream bool) map[string]any {
	var systemParts []string
	msgs := make([]map[string]any, 0, len(req.Messages))
	var pendingToolResults []map[string]any

	flushToolResults := func() {
		if len(pendingToolResults) == 0 {
			return
		}
		// Anthropic 要求同轮多个 tool_result 合并进同一条 user 消息，遵守角色严格交替约束
		msgs = append(msgs, map[string]any{
			"role":    "user",
			"content": pendingToolResults,
		})
		pendingToolResults = nil
	}

	for _, m := range req.Messages {
		if m.Role == "system" {
			systemParts = append(systemParts, m.Content)
			continue
		}
		if m.Role == "tool" {
			pendingToolResults = append(pendingToolResults, map[string]any{
				"type":        "tool_result",
				"tool_use_id": m.ToolCallID,
				"content":     m.Content,
			})
			continue
		}
		flushToolResults()

		if m.Role == "assistant" && len(m.ToolCalls) > 0 {
			blocks := make([]map[string]any, 0, len(m.ToolCalls)+1)
			if m.Content != "" {
				blocks = append(blocks, map[string]any{"type": "text", "text": m.Content})
			}
			for _, tc := range m.ToolCalls {
				var inputObj any = map[string]any{}
				if strings.TrimSpace(tc.Arguments) != "" {
					_ = json.Unmarshal([]byte(tc.Arguments), &inputObj)
				}
				blocks = append(blocks, map[string]any{
					"type":  "tool_use",
					"id":    tc.ID,
					"name":  tc.Name,
					"input": inputObj,
				})
			}
			msgs = append(msgs, map[string]any{"role": "assistant", "content": blocks})
			continue
		}
		msgs = append(msgs, map[string]any{"role": m.Role, "content": m.Content})
	}
	flushToolResults()

	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 2048
	}
	payload := map[string]any{
		"model":       req.Model,
		"max_tokens":  maxTokens,
		"temperature": req.Temperature,
		"messages":    msgs,
	}
	if stream {
		payload["stream"] = true
	}
	if len(systemParts) > 0 {
		payload["system"] = strings.Join(systemParts, "\n")
	}
	if len(req.Tools) > 0 {
		tools := make([]map[string]any, 0, len(req.Tools))
		for _, t := range req.Tools {
			schema := t.Parameters
			if schema == nil {
				schema = map[string]any{"type": "object", "properties": map[string]any{}}
			}
			tools = append(tools, map[string]any{
				"name":         t.Name,
				"description":  t.Description,
				"input_schema": schema,
			})
		}
		payload["tools"] = tools
	}
	return payload
}

func (c *AnthropicClient) doRequest(ctx context.Context, payload map[string]any) (*http.Response, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	endpoint := c.baseURL + "/v1/messages"
	if strings.HasSuffix(c.baseURL, "/v1") {
		endpoint = c.baseURL + "/messages"
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	if c.apiKey != "" {
		httpReq.Header.Set("x-api-key", c.apiKey)
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

func (c *AnthropicClient) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	resp, err := c.doRequest(ctx, c.buildPayload(req, false))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var decoded struct {
		StopReason string `json:"stop_reason"`
		Content    []struct {
			Type     string          `json:"type"`
			Text     string          `json:"text"`
			Thinking string          `json:"thinking"`
			ID       string          `json:"id"`
			Name     string          `json:"name"`
			Input    json.RawMessage `json:"input"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}

	var textBuf strings.Builder
	var thinkingBuf strings.Builder
	var toolCalls []ToolCall
	for _, block := range decoded.Content {
		switch block.Type {
		case "text":
			textBuf.WriteString(block.Text)
		case "thinking":
			thinkingBuf.WriteString(block.Thinking)
		case "tool_use":
			args := "{}"
			if len(block.Input) > 0 {
				args = string(block.Input)
			}
			toolCalls = append(toolCalls, ToolCall{
				ID:        block.ID,
				Name:      block.Name,
				Arguments: args,
			})
		}
	}
	out := &ChatResponse{
		Content:          textBuf.String(),
		ReasoningContent: thinkingBuf.String(),
		ToolCalls:        toolCalls,
		FinishReason:     decoded.StopReason,
		Usage: Usage{
			PromptTokens:     decoded.Usage.InputTokens,
			CompletionTokens: decoded.Usage.OutputTokens,
			TotalTokens:      decoded.Usage.InputTokens + decoded.Usage.OutputTokens,
		},
	}
	fillEstimatedUsage(&out.Usage, req.Messages, out.Content)
	return out, nil
}

func (c *AnthropicClient) ChatStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk) error) (*ChatResponse, error) {
	resp, err := c.doRequest(ctx, c.buildPayload(req, true))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)

	var textBuf strings.Builder
	var thinkingBuf strings.Builder
	type toolAcc struct {
		id   string
		name string
		args strings.Builder
	}
	toolMap := make(map[int]*toolAcc)
	var usage Usage
	var finishReason string
	var currentEvent string

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			currentEvent = ""
			continue
		}
		if strings.HasPrefix(line, "event:") {
			currentEvent = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
			continue
		}
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "" || data == "[DONE]" {
			continue
		}

		var evt struct {
			Type    string `json:"type"`
			Index   int    `json:"index"`
			Message *struct {
				Usage *struct {
					InputTokens  int `json:"input_tokens"`
					OutputTokens int `json:"output_tokens"`
				} `json:"usage"`
			} `json:"message"`
			ContentBlock *struct {
				Type string `json:"type"`
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"content_block"`
			Delta *struct {
				Type        string `json:"type"`
				Text        string `json:"text"`
				Thinking    string `json:"thinking"`
				PartialJSON string `json:"partial_json"`
				StopReason  string `json:"stop_reason"`
			} `json:"delta"`
			Usage *struct {
				OutputTokens int `json:"output_tokens"`
			} `json:"usage"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal([]byte(data), &evt); err != nil {
			continue
		}
		evtType := evt.Type
		if evtType == "" {
			evtType = currentEvent
		}

		switch evtType {
		case "error":
			msg := "Anthropic 流式响应错误"
			if evt.Error != nil && evt.Error.Message != "" {
				msg = evt.Error.Message
			}
			return nil, errors.New(msg)
		case "message_start":
			if evt.Message != nil && evt.Message.Usage != nil {
				usage.PromptTokens += evt.Message.Usage.InputTokens
				usage.CompletionTokens += evt.Message.Usage.OutputTokens
			}
		case "content_block_start":
			if evt.ContentBlock != nil && evt.ContentBlock.Type == "tool_use" {
				toolMap[evt.Index] = &toolAcc{
					id:   evt.ContentBlock.ID,
					name: evt.ContentBlock.Name,
				}
			}
		case "content_block_delta":
			if evt.Delta == nil {
				continue
			}
			switch evt.Delta.Type {
			case "text_delta":
				if evt.Delta.Text != "" {
					textBuf.WriteString(evt.Delta.Text)
					if onChunk != nil {
						if err := onChunk(StreamChunk{DeltaContent: evt.Delta.Text}); err != nil {
							return nil, err
						}
					}
				}
			case "thinking_delta":
				if evt.Delta.Thinking != "" {
					thinkingBuf.WriteString(evt.Delta.Thinking)
					if onChunk != nil {
						if err := onChunk(StreamChunk{DeltaReasoning: evt.Delta.Thinking}); err != nil {
							return nil, err
						}
					}
				}
			case "input_json_delta":
				if acc, ok := toolMap[evt.Index]; ok {
					acc.args.WriteString(evt.Delta.PartialJSON)
				}
			}
		case "message_delta":
			if evt.Delta != nil && evt.Delta.StopReason != "" {
				finishReason = evt.Delta.StopReason
			}
			if evt.Usage != nil && evt.Usage.OutputTokens > 0 {
				usage.CompletionTokens = evt.Usage.OutputTokens
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
		acc := toolMap[idx]
		args := strings.TrimSpace(acc.args.String())
		if args == "" {
			args = "{}"
		}
		id := acc.id
		if id == "" {
			id = fmt.Sprintf("anthropic_call_%d", i+1)
		}
		toolCalls = append(toolCalls, ToolCall{
			ID:        id,
			Name:      acc.name,
			Arguments: args,
		})
	}

	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	out := &ChatResponse{
		Content:          textBuf.String(),
		ReasoningContent: thinkingBuf.String(),
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

func (c *AnthropicClient) Ping(ctx context.Context, model string) (int64, error) {
	started := time.Now()
	_, err := c.Chat(ctx, ChatRequest{
		Model:     model,
		Messages:  []Message{{Role: "user", Content: "ping"}},
		MaxTokens: 4,
	})
	return time.Since(started).Milliseconds(), err
}
