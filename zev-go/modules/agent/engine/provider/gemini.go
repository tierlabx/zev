package provider

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// GeminiClient 适配 Google Gemini Generative Language REST API
type GeminiClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewGeminiClient(cfg Config) *GeminiClient {
	base := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if base == "" {
		base = "https://generativelanguage.googleapis.com/v1beta"
	}
	timeout := time.Duration(cfg.TimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	return &GeminiClient{
		baseURL:    base,
		apiKey:     strings.TrimSpace(cfg.APIKey),
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (c *GeminiClient) buildPayload(req ChatRequest) map[string]any {
	var systemParts []string
	contents := make([]map[string]any, 0, len(req.Messages))
	var pendingToolParts []map[string]any

	flushToolParts := func() {
		if len(pendingToolParts) == 0 {
			return
		}
		contents = append(contents, map[string]any{
			"role":  "user",
			"parts": pendingToolParts,
		})
		pendingToolParts = nil
	}

	for _, m := range req.Messages {
		if m.Role == "system" {
			systemParts = append(systemParts, m.Content)
			continue
		}
		if m.Role == "tool" {
			pendingToolParts = append(pendingToolParts, map[string]any{
				"functionResponse": map[string]any{
					"name":     m.ToolName,
					"response": map[string]any{"result": m.Content},
				},
			})
			continue
		}
		flushToolParts()

		role := "user"
		if m.Role == "assistant" {
			role = "model"
		}
		parts := []map[string]any{}
		if m.Content != "" {
			parts = append(parts, map[string]any{"text": m.Content})
		}
		for _, tc := range m.ToolCalls {
			var argsObj map[string]any
			_ = json.Unmarshal([]byte(tc.Arguments), &argsObj)
			parts = append(parts, map[string]any{
				"functionCall": map[string]any{
					"name": tc.Name,
					"args": argsObj,
				},
			})
		}
		if len(parts) > 0 {
			contents = append(contents, map[string]any{"role": role, "parts": parts})
		}
	}
	flushToolParts()

	genCfg := map[string]any{
		"temperature": req.Temperature,
	}
	if req.MaxTokens > 0 {
		genCfg["maxOutputTokens"] = req.MaxTokens
	}
	payload := map[string]any{
		"contents":         contents,
		"generationConfig": genCfg,
	}
	if len(systemParts) > 0 {
		payload["systemInstruction"] = map[string]any{
			"parts": []map[string]any{{"text": strings.Join(systemParts, "\n")}},
		}
	}
	if len(req.Tools) > 0 {
		decls := make([]map[string]any, 0, len(req.Tools))
		for _, t := range req.Tools {
			decls = append(decls, map[string]any{
				"name":        t.Name,
				"description": t.Description,
				"parameters":  t.Parameters,
			})
		}
		payload["tools"] = []map[string]any{{"functionDeclarations": decls}}
	}
	return payload
}

type geminiResponsePayload struct {
	Candidates []struct {
		FinishReason string `json:"finishReason"`
		Content      struct {
			Parts []struct {
				Text         string `json:"text"`
				Thought      bool   `json:"thought"`
				FunctionCall *struct {
					Name string          `json:"name"`
					Args json.RawMessage `json:"args"`
				} `json:"functionCall"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		TotalTokenCount      int `json:"totalTokenCount"`
	} `json:"usageMetadata"`
}

func (c *GeminiClient) doRequest(ctx context.Context, endpoint string, payload map[string]any) (*http.Response, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
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

func (c *GeminiClient) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	endpoint := fmt.Sprintf("%s/models/%s:generateContent", c.baseURL, url.PathEscape(req.Model))
	if c.apiKey != "" {
		endpoint += "?key=" + url.QueryEscape(c.apiKey)
	}
	resp, err := c.doRequest(ctx, endpoint, c.buildPayload(req))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var decoded geminiResponsePayload
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}

	var textBuf strings.Builder
	var thinkingBuf strings.Builder
	var toolCalls []ToolCall
	finishReason := ""
	if len(decoded.Candidates) > 0 {
		cand := decoded.Candidates[0]
		finishReason = cand.FinishReason
		for i, part := range cand.Content.Parts {
			if part.Text != "" {
				if part.Thought {
					thinkingBuf.WriteString(part.Text)
				} else {
					textBuf.WriteString(part.Text)
				}
			}
			if part.FunctionCall != nil {
				args := "{}"
				if len(part.FunctionCall.Args) > 0 {
					args = string(part.FunctionCall.Args)
				}
				toolCalls = append(toolCalls, ToolCall{
					ID:        fmt.Sprintf("gemini_call_%d", i+1),
					Name:      part.FunctionCall.Name,
					Arguments: args,
				})
			}
		}
	}

	out := &ChatResponse{
		Content:          textBuf.String(),
		ReasoningContent: thinkingBuf.String(),
		ToolCalls:        toolCalls,
		FinishReason:     finishReason,
		Usage: Usage{
			PromptTokens:     decoded.UsageMetadata.PromptTokenCount,
			CompletionTokens: decoded.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      decoded.UsageMetadata.TotalTokenCount,
		},
	}
	fillEstimatedUsage(&out.Usage, req.Messages, out.Content)
	return out, nil
}

func (c *GeminiClient) ChatStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk) error) (*ChatResponse, error) {
	endpoint := fmt.Sprintf("%s/models/%s:streamGenerateContent?alt=sse", c.baseURL, url.PathEscape(req.Model))
	if c.apiKey != "" {
		endpoint += "&key=" + url.QueryEscape(c.apiKey)
	}
	resp, err := c.doRequest(ctx, endpoint, c.buildPayload(req))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)

	var textBuf strings.Builder
	var thinkingBuf strings.Builder
	var toolCalls []ToolCall
	var usage Usage
	finishReason := ""

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "" || data == "[DONE]" {
			continue
		}
		var chunk geminiResponsePayload
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if chunk.UsageMetadata.TotalTokenCount > 0 {
			usage = Usage{
				PromptTokens:     chunk.UsageMetadata.PromptTokenCount,
				CompletionTokens: chunk.UsageMetadata.CandidatesTokenCount,
				TotalTokens:      chunk.UsageMetadata.TotalTokenCount,
			}
		}
		if len(chunk.Candidates) == 0 {
			continue
		}
		cand := chunk.Candidates[0]
		if cand.FinishReason != "" {
			finishReason = cand.FinishReason
		}
		for _, part := range cand.Content.Parts {
			if part.Text != "" {
				if part.Thought {
					thinkingBuf.WriteString(part.Text)
					if onChunk != nil {
						if err := onChunk(StreamChunk{DeltaReasoning: part.Text}); err != nil {
							return nil, err
						}
					}
				} else {
					textBuf.WriteString(part.Text)
					if onChunk != nil {
						if err := onChunk(StreamChunk{DeltaContent: part.Text}); err != nil {
							return nil, err
						}
					}
				}
			}
			if part.FunctionCall != nil {
				args := "{}"
				if len(part.FunctionCall.Args) > 0 {
					args = string(part.FunctionCall.Args)
				}
				toolCalls = append(toolCalls, ToolCall{
					ID:        fmt.Sprintf("gemini_call_%d", len(toolCalls)+1),
					Name:      part.FunctionCall.Name,
					Arguments: args,
				})
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

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

func (c *GeminiClient) Ping(ctx context.Context, model string) (int64, error) {
	started := time.Now()
	_, err := c.Chat(ctx, ChatRequest{
		Model:     model,
		Messages:  []Message{{Role: "user", Content: "ping"}},
		MaxTokens: 4,
	})
	return time.Since(started).Milliseconds(), err
}
