package entity

// AllModels 返回 agent 模块需要自动迁移的全部数据库模型
func AllModels() []any {
	return []any{
		&AgentProvider{},
		&AgentDefinition{},
		&AgentRun{},
		&AgentRunSpan{},
		&AgentApproval{},
		&AgentEvalDataset{},
		&AgentEvalCase{},
		&AgentEvalRun{},
		&AgentEvalCaseResult{},
	}
}
