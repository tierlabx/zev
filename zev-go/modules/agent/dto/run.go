package dto

import (
	"time"

	"zev-go/modules/agent/engine/provider"
)

type RunStreamReq struct {
	AgentID uint               `json:"agent_id" binding:"required"`
	Input   string             `json:"input" binding:"required"`
	History []provider.Message `json:"history"`
}

type RunListReq struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	AgentID  uint   `form:"agentId"`
	Status   string `form:"status"`
	Keyword  string `form:"keyword"`
}

type RunRes struct {
	ID               uint      `json:"id"`
	AgentID          uint      `json:"agent_id"`
	AgentName        string    `json:"agent_name"`
	ProviderID       uint      `json:"provider_id"`
	Model            string    `json:"model"`
	Status           string    `json:"status"`
	InputSummary     string    `json:"input_summary"`
	OutputSummary    string    `json:"output_summary"`
	StepCount        int       `json:"step_count"`
	PromptTokens     int       `json:"prompt_tokens"`
	CompletionTokens int       `json:"completion_tokens"`
	TotalTokens      int       `json:"total_tokens"`
	DurationMs       int64     `json:"duration_ms"`
	ErrorMessage     string    `json:"error_message"`
	CreatedBy        uint      `json:"created_by"`
	CreatedAt        time.Time `json:"created_at"`
}

type RunSpanRes struct {
	ID           uint       `json:"id"`
	RunID        uint       `json:"run_id"`
	ParentSpanID uint       `json:"parent_span_id"`
	SpanType     string     `json:"span_type"`
	Name         string     `json:"name"`
	Status       string     `json:"status"`
	InputJSON    string     `json:"input_json"`
	OutputJSON   string     `json:"output_json"`
	Tokens       int        `json:"tokens"`
	StartedAt    time.Time  `json:"started_at"`
	EndedAt      *time.Time `json:"ended_at"`
	DurationMs   int64      `json:"duration_ms"`
	ErrorMessage string     `json:"error_message"`
}

type RunDetailRes struct {
	Run      RunRes             `json:"run"`
	Messages []provider.Message `json:"messages"`
	Spans    []RunSpanRes       `json:"spans"`
}

type RunHeartbeatRes struct {
	RunID      uint      `json:"run_id"`
	Status     string    `json:"status"`
	AgentName  string    `json:"agent_name"`
	DurationMs int64     `json:"duration_ms"`
	CreatedAt  time.Time `json:"created_at"`
}
