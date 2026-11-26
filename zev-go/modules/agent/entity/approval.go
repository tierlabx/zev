package entity

import (
	"time"

	"gorm.io/gorm"
)

// AgentApproval 记录 Human-in-the-Loop 高危工具调用挂起审批单
type AgentApproval struct {
	gorm.Model
	RunID           uint       `gorm:"not null;index" json:"run_id"`
	AgentID         uint       `gorm:"not null;index" json:"agent_id"`
	AgentName       string     `gorm:"size:100" json:"agent_name"`
	ToolName        string     `gorm:"size:128;not null" json:"tool_name"`
	ToolArgsJSON    string     `gorm:"type:text" json:"tool_args_json"`
	RiskLevel       string     `gorm:"size:32;not null" json:"risk_level"` // medium / high / critical
	Reason          string     `gorm:"size:500" json:"reason"`
	Status          string     `gorm:"size:32;not null;index" json:"status"` // pending / approved / rejected / expired
	RequesterID     uint       `gorm:"index" json:"requester_id"`
	RequesterName   string     `gorm:"size:100" json:"requester_name"`
	ApproverID      uint       `gorm:"index" json:"approver_id"`
	ApproverName    string     `gorm:"size:100" json:"approver_name"`
	DecisionComment string     `gorm:"size:500" json:"decision_comment"`
	DecidedAt       *time.Time `json:"decided_at"`
	ExpiresAt       time.Time  `gorm:"index" json:"expires_at"`
	DeptID          uint       `gorm:"default:0;index" json:"dept_id"`
	CreatedBy       uint       `gorm:"default:0;index" json:"created_by"`
}

func (AgentApproval) TableName() string {
	return "agent_approvals"
}
