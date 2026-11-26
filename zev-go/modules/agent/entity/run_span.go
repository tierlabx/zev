package entity

import (
	"time"

	"gorm.io/gorm"
)

// AgentRunSpan 记录单次 Run 中的全链路执行节点（LLM / Tool / Guardrail / Approval）
type AgentRunSpan struct {
	gorm.Model
	RunID        uint       `gorm:"not null;index" json:"run_id"`
	ParentSpanID uint       `gorm:"default:0;index" json:"parent_span_id"`
	SpanType     string     `gorm:"size:32;not null;index" json:"span_type"` // llm / tool / guardrail / approval / system
	Name         string     `gorm:"size:128;not null" json:"name"`
	Status       string     `gorm:"size:32;not null" json:"status"` // running / ok / error / blocked / waiting
	InputJSON    string     `gorm:"type:text" json:"input_json"`
	OutputJSON   string     `gorm:"type:text" json:"output_json"`
	Tokens       int        `gorm:"default:0" json:"tokens"`
	StartedAt    time.Time  `gorm:"index" json:"started_at"`
	EndedAt      *time.Time `json:"ended_at"`
	DurationMs   int64      `gorm:"default:0" json:"duration_ms"`
	ErrorMessage string     `gorm:"size:1000" json:"error_message"`
}

func (AgentRunSpan) TableName() string {
	return "agent_run_spans"
}
