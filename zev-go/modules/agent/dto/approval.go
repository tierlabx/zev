package dto

import "time"

type ApprovalListReq struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Status   string `form:"status"`
	RunID    uint   `form:"runId"`
}

type ApprovalDecideReq struct {
	Approved bool   `json:"approved"`
	Comment  string `json:"comment" binding:"max=500"`
}

type ApprovalRes struct {
	ID              uint       `json:"id"`
	RunID           uint       `json:"run_id"`
	AgentID         uint       `json:"agent_id"`
	AgentName       string     `json:"agent_name"`
	ToolName        string     `json:"tool_name"`
	ToolArgsJSON    string     `json:"tool_args_json"`
	RiskLevel       string     `json:"risk_level"`
	Reason          string     `json:"reason"`
	Status          string     `json:"status"`
	RequesterID     uint       `json:"requester_id"`
	RequesterName   string     `json:"requester_name"`
	ApproverID      uint       `json:"approver_id"`
	ApproverName    string     `json:"approver_name"`
	DecisionComment string     `json:"decision_comment"`
	DecidedAt       *time.Time `json:"decided_at"`
	ExpiresAt       time.Time  `json:"expires_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

type ApprovalPendingCountRes struct {
	Count int64 `json:"count"`
}
