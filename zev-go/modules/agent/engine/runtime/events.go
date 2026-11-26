package runtime

import "time"

const (
	EventRunStarted       = "run_started"
	EventStepStarted      = "step_started"
	EventReasoning        = "reasoning"
	EventToken            = "token"
	EventToolCall         = "tool_call"
	EventToolResult       = "tool_result"
	EventGuardrail        = "guardrail"
	EventApprovalRequired = "approval_required"
	EventApprovalResolved = "approval_resolved"
	EventCompleted        = "completed"
	EventError            = "error"
)

// Event 表示运行时向 SSE 前端实时推送的标准事件信封
type Event struct {
	Type       string    `json:"type"`
	RunID      uint      `json:"run_id,omitempty"`
	Step       int       `json:"step,omitempty"`
	Content    string    `json:"content,omitempty"`
	ToolName   string    `json:"tool_name,omitempty"`
	ToolCall   string    `json:"tool_call_id,omitempty"`
	Arguments  string    `json:"arguments,omitempty"`
	Result     string    `json:"result,omitempty"`
	Status     string    `json:"status,omitempty"`
	Reason     string    `json:"reason,omitempty"`
	ApprovalID uint      `json:"approval_id,omitempty"`
	Approval   any       `json:"approval,omitempty"`
	Usage      any       `json:"usage,omitempty"`
	Duration   int64     `json:"duration_ms,omitempty"`
	Timestamp  time.Time `json:"timestamp"`
}

// SpanRecord 由运行时产生的单节点追踪记录，交由 Service 层持久化为 AgentRunSpan
type SpanRecord struct {
	SpanType     string
	Name         string
	Status       string
	InputJSON    string
	OutputJSON   string
	Tokens       int
	StartedAt    time.Time
	EndedAt      time.Time
	DurationMs   int64
	ErrorMessage string
}
