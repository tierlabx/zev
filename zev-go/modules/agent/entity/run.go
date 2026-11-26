package entity

import "gorm.io/gorm"

// AgentRun 记录单次智能体执行会话的指标、状态与脱敏消息快照
type AgentRun struct {
	gorm.Model
	AgentID          uint   `gorm:"not null;index" json:"agent_id"`
	AgentName        string `gorm:"size:100" json:"agent_name"`
	ProviderID       uint   `gorm:"index" json:"provider_id"`
	ModelName        string `gorm:"column:model;size:100" json:"model"`
	Status           string `gorm:"size:32;not null;index" json:"status"` // running / waiting_approval / completed / failed / cancelled
	InputSummary     string `gorm:"size:500" json:"input_summary"`
	OutputSummary    string `gorm:"size:1000" json:"output_summary"`
	MessagesJSON     string `gorm:"type:text;default:'[]'" json:"messages_json"`
	StepCount        int    `gorm:"default:0" json:"step_count"`
	PromptTokens     int    `gorm:"default:0" json:"prompt_tokens"`
	CompletionTokens int    `gorm:"default:0" json:"completion_tokens"`
	TotalTokens      int    `gorm:"default:0" json:"total_tokens"`
	DurationMs       int64  `gorm:"default:0" json:"duration_ms"`
	ErrorMessage     string `gorm:"size:1000" json:"error_message"`
	DeptID           uint   `gorm:"default:0;index" json:"dept_id"`
	CreatedBy        uint   `gorm:"default:0;index" json:"created_by"`
}

func (AgentRun) TableName() string {
	return "agent_runs"
}
