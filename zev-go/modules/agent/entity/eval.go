package entity

import (
	"time"

	"gorm.io/gorm"
)

// AgentEvalDataset 评测数据集，关联目标 Agent 并定义发布门禁阈值
type AgentEvalDataset struct {
	gorm.Model
	Name          string  `gorm:"size:128;not null" json:"name"`
	Description   string  `gorm:"size:500" json:"description"`
	AgentID       uint    `gorm:"not null;index" json:"agent_id"`
	PassThreshold float64 `gorm:"default:0.8" json:"pass_threshold"` // 0~1，通过率达到该值则门禁通过
	DeptID        uint    `gorm:"default:0;index" json:"dept_id"`
	CreatedBy     uint    `gorm:"default:0;index" json:"created_by"`
}

func (AgentEvalDataset) TableName() string {
	return "agent_eval_datasets"
}

// AgentEvalCase 评测用例，支持正则/子串断言、JSON 结构断言以及可选 LLM-as-a-Judge 评分标准
type AgentEvalCase struct {
	gorm.Model
	DatasetID          uint   `gorm:"not null;index" json:"dataset_id"`
	Name               string `gorm:"size:128;not null" json:"name"`
	Input              string `gorm:"type:text;not null" json:"input"`
	ExpectedPattern    string `gorm:"size:500" json:"expected_pattern"`
	ExpectedJSONSchema string `gorm:"type:text" json:"expected_json_schema"`
	JudgeCriteria      string `gorm:"type:text" json:"judge_criteria"`
	Tags               string `gorm:"size:255" json:"tags"`
	Sort               int    `gorm:"default:0" json:"sort"`
}

func (AgentEvalCase) TableName() string {
	return "agent_eval_cases"
}

// AgentEvalRun 评测回归批次报告
type AgentEvalRun struct {
	gorm.Model
	DatasetID    uint       `gorm:"not null;index" json:"dataset_id"`
	AgentID      uint       `gorm:"not null;index" json:"agent_id"`
	AgentName    string     `gorm:"size:100" json:"agent_name"`
	Status       string     `gorm:"size:32;not null;index" json:"status"` // running / completed / failed
	TotalCases   int        `gorm:"default:0" json:"total_cases"`
	PassedCases  int        `gorm:"default:0" json:"passed_cases"`
	FailedCases  int        `gorm:"default:0" json:"failed_cases"`
	PassRate     float64    `gorm:"default:0" json:"pass_rate"`
	GatePassed   bool       `gorm:"default:false" json:"gate_passed"`
	AvgLatencyMs int64      `gorm:"default:0" json:"avg_latency_ms"`
	TotalTokens  int        `gorm:"default:0" json:"total_tokens"`
	CompletedAt  *time.Time `json:"completed_at"`
	DeptID       uint       `gorm:"default:0;index" json:"dept_id"`
	CreatedBy    uint       `gorm:"default:0;index" json:"created_by"`
}

func (AgentEvalRun) TableName() string {
	return "agent_eval_runs"
}

// AgentEvalCaseResult 单条评测用例在某次评测批次中的执行与评分结果
type AgentEvalCaseResult struct {
	gorm.Model
	EvalRunID       uint    `gorm:"not null;index" json:"eval_run_id"`
	CaseID          uint    `gorm:"not null;index" json:"case_id"`
	CaseName        string  `gorm:"size:128" json:"case_name"`
	RunID           uint    `gorm:"default:0;index" json:"run_id"`
	Passed          bool    `gorm:"default:false" json:"passed"`
	Score           float64 `gorm:"default:0" json:"score"`
	ActualOutput    string  `gorm:"type:text" json:"actual_output"`
	AssertionDetail string  `gorm:"type:text" json:"assertion_detail"`
	JudgeReason     string  `gorm:"type:text" json:"judge_reason"`
	LatencyMs       int64   `gorm:"default:0" json:"latency_ms"`
	Tokens          int     `gorm:"default:0" json:"tokens"`
}

func (AgentEvalCaseResult) TableName() string {
	return "agent_eval_case_results"
}
