package dto

import "time"

type EvalDatasetListReq struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Keyword  string `form:"keyword"`
}

type EvalDatasetCreateReq struct {
	Name          string  `json:"name" binding:"required,max=128"`
	Description   string  `json:"description" binding:"max=500"`
	AgentID       uint    `json:"agent_id" binding:"required"`
	PassThreshold float64 `json:"pass_threshold"`
}

type EvalDatasetUpdateReq struct {
	ID            uint    `json:"id" binding:"required"`
	Name          string  `json:"name" binding:"required,max=128"`
	Description   string  `json:"description" binding:"max=500"`
	AgentID       uint    `json:"agent_id" binding:"required"`
	PassThreshold float64 `json:"pass_threshold"`
}

type EvalDatasetRes struct {
	ID             uint      `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	AgentID        uint      `json:"agent_id"`
	AgentName      string    `json:"agent_name"`
	PassThreshold  float64   `json:"pass_threshold"`
	CaseCount      int64     `json:"case_count"`
	LatestPassRate *float64  `json:"latest_pass_rate"`
	PassRateDelta  *float64  `json:"pass_rate_delta"`
	LatestGatePass *bool     `json:"latest_gate_pass"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type EvalCaseCreateReq struct {
	DatasetID          uint   `json:"dataset_id" binding:"required"`
	Name               string `json:"name" binding:"required,max=128"`
	Input              string `json:"input" binding:"required"`
	ExpectedPattern    string `json:"expected_pattern" binding:"max=500"`
	ExpectedJSONSchema string `json:"expected_json_schema"`
	JudgeCriteria      string `json:"judge_criteria"`
	Tags               string `json:"tags" binding:"max=255"`
	Sort               int    `json:"sort"`
}

type EvalCaseUpdateReq struct {
	ID                 uint   `json:"id" binding:"required"`
	Name               string `json:"name" binding:"required,max=128"`
	Input              string `json:"input" binding:"required"`
	ExpectedPattern    string `json:"expected_pattern" binding:"max=500"`
	ExpectedJSONSchema string `json:"expected_json_schema"`
	JudgeCriteria      string `json:"judge_criteria"`
	Tags               string `json:"tags" binding:"max=255"`
	Sort               int    `json:"sort"`
}

type EvalCaseRes struct {
	ID                 uint      `json:"id"`
	DatasetID          uint      `json:"dataset_id"`
	Name               string    `json:"name"`
	Input              string    `json:"input"`
	ExpectedPattern    string    `json:"expected_pattern"`
	ExpectedJSONSchema string    `json:"expected_json_schema"`
	JudgeCriteria      string    `json:"judge_criteria"`
	Tags               string    `json:"tags"`
	Sort               int       `json:"sort"`
	CreatedAt          time.Time `json:"created_at"`
}

type EvalRunListReq struct {
	Page      int  `form:"page"`
	PageSize  int  `form:"pageSize"`
	DatasetID uint `form:"datasetId"`
}

type EvalRunRes struct {
	ID           uint       `json:"id"`
	DatasetID    uint       `json:"dataset_id"`
	AgentID      uint       `json:"agent_id"`
	AgentName    string     `json:"agent_name"`
	Status       string     `json:"status"`
	TotalCases   int        `json:"total_cases"`
	PassedCases  int        `json:"passed_cases"`
	FailedCases  int        `json:"failed_cases"`
	PassRate     float64    `json:"pass_rate"`
	GatePassed   bool       `json:"gate_passed"`
	AvgLatencyMs int64      `json:"avg_latency_ms"`
	TotalTokens  int        `json:"total_tokens"`
	CompletedAt  *time.Time `json:"completed_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

type EvalCaseResultRes struct {
	ID              uint    `json:"id"`
	EvalRunID       uint    `json:"eval_run_id"`
	CaseID          uint    `json:"case_id"`
	CaseName        string  `json:"case_name"`
	RunID           uint    `json:"run_id"`
	Passed          bool    `json:"passed"`
	Score           float64 `json:"score"`
	ActualOutput    string  `json:"actual_output"`
	AssertionDetail string  `json:"assertion_detail"`
	JudgeReason     string  `json:"judge_reason"`
	LatencyMs       int64   `json:"latency_ms"`
	Tokens          int     `json:"tokens"`
}

type EvalRunDetailRes struct {
	Run     EvalRunRes          `json:"run"`
	Results []EvalCaseResultRes `json:"results"`
}
