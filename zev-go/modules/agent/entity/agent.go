package entity

import "gorm.io/gorm"

// AgentDefinition 智能体编排定义，聚合提示词、模型绑定、工具白名单、MCP 与护栏策略
type AgentDefinition struct {
	gorm.Model
	Name            string  `gorm:"size:100;not null" json:"name"`
	Code            string  `gorm:"size:64;not null;uniqueIndex:idx_agent_definitions_code" json:"code"`
	Description     string  `gorm:"size:500" json:"description"`
	ProviderID      uint    `gorm:"not null;index" json:"provider_id"`
	ModelName       string  `gorm:"column:model;size:100" json:"model"`
	SystemPrompt    string  `gorm:"type:text" json:"system_prompt"`
	Temperature     float64 `gorm:"default:0.7" json:"temperature"`
	MaxSteps        int     `gorm:"default:8" json:"max_steps"`
	MaxTokens       int     `gorm:"default:16384" json:"max_tokens"`
	ToolWhitelist   string  `gorm:"type:text;default:'[]'" json:"tool_whitelist"`   // JSON []string
	McpServers      string  `gorm:"type:text;default:'[]'" json:"mcp_servers"`      // JSON []McpServerConfig
	GuardrailConfig string  `gorm:"type:text;default:'{}'" json:"guardrail_config"` // JSON GuardrailConfig
	Status          int     `gorm:"default:0;index" json:"status"`                  // 0:启用 1:禁用
	DeptID          uint    `gorm:"default:0;index" json:"dept_id"`
	CreatedBy       uint    `gorm:"default:0;index" json:"created_by"`
}

func (AgentDefinition) TableName() string {
	return "agent_definitions"
}
