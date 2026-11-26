package dto

import (
	"time"

	"zev-go/modules/agent/engine/guardrail"
	"zev-go/modules/agent/engine/tool"
)

type AgentListReq struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Keyword  string `form:"keyword"`
	Status   string `form:"status"`
}

type AgentCreateReq struct {
	Name            string                 `json:"name" binding:"required,max=100"`
	Code            string                 `json:"code" binding:"required,max=64"`
	Description     string                 `json:"description" binding:"max=500"`
	ProviderID      uint                   `json:"provider_id" binding:"required"`
	Model           string                 `json:"model" binding:"max=100"`
	SystemPrompt    string                 `json:"system_prompt"`
	Temperature     float64                `json:"temperature"`
	MaxSteps        int                    `json:"max_steps"`
	MaxTokens       int                    `json:"max_tokens"`
	ToolWhitelist   []string               `json:"tool_whitelist"`
	McpServers      []tool.MCPServerConfig `json:"mcp_servers"`
	GuardrailConfig guardrail.Policy       `json:"guardrail_config"`
	Status          int                    `json:"status"`
}

type AgentUpdateReq struct {
	ID              uint                   `json:"id" binding:"required"`
	Name            string                 `json:"name" binding:"required,max=100"`
	Code            string                 `json:"code" binding:"required,max=64"`
	Description     string                 `json:"description" binding:"max=500"`
	ProviderID      uint                   `json:"provider_id" binding:"required"`
	Model           string                 `json:"model" binding:"max=100"`
	SystemPrompt    string                 `json:"system_prompt"`
	Temperature     float64                `json:"temperature"`
	MaxSteps        int                    `json:"max_steps"`
	MaxTokens       int                    `json:"max_tokens"`
	ToolWhitelist   []string               `json:"tool_whitelist"`
	McpServers      []tool.MCPServerConfig `json:"mcp_servers"`
	GuardrailConfig guardrail.Policy       `json:"guardrail_config"`
	Status          int                    `json:"status"`
}

type AgentRes struct {
	ID              uint                   `json:"id"`
	Name            string                 `json:"name"`
	Code            string                 `json:"code"`
	Description     string                 `json:"description"`
	ProviderID      uint                   `json:"provider_id"`
	ProviderName    string                 `json:"provider_name"`
	Model           string                 `json:"model"`
	SystemPrompt    string                 `json:"system_prompt"`
	Temperature     float64                `json:"temperature"`
	MaxSteps        int                    `json:"max_steps"`
	MaxTokens       int                    `json:"max_tokens"`
	ToolWhitelist   []string               `json:"tool_whitelist"`
	McpServers      []tool.MCPServerConfig `json:"mcp_servers"`
	GuardrailConfig guardrail.Policy       `json:"guardrail_config"`
	Status          int                    `json:"status"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

type AgentOptionRes struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	Code         string `json:"code"`
	Model        string `json:"model"`
	ProviderName string `json:"provider_name"`
	Description  string `json:"description"`
}

type ToolCatalogRes struct {
	Tools []tool.Meta `json:"tools"`
}
