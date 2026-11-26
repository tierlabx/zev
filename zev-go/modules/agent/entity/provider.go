package entity

import "gorm.io/gorm"

// AgentProvider 模型供应商配置表，持久化多协议 LLM 网关与加密凭据
type AgentProvider struct {
	gorm.Model
	Name            string `gorm:"size:100;not null;uniqueIndex:idx_agent_providers_name" json:"name"`
	ProviderType    string `gorm:"size:32;not null;index" json:"provider_type"` // openai / anthropic / gemini / ollama
	BaseURL         string `gorm:"size:255;not null" json:"base_url"`
	APIKeyEncrypted string `gorm:"type:text" json:"-"`
	APIKeyMasked    string `gorm:"size:64" json:"api_key_masked"`
	DefaultModel    string `gorm:"size:100;not null" json:"default_model"`
	Models          string `gorm:"type:text;default:'[]'" json:"models"` // JSON 字符串数组
	TimeoutSec      int    `gorm:"default:60" json:"timeout_sec"`
	Status          int    `gorm:"default:0;index" json:"status"` // 0:启用 1:禁用
	Remark          string `gorm:"size:500" json:"remark"`
	DeptID          uint   `gorm:"default:0;index" json:"dept_id"`
	CreatedBy       uint   `gorm:"default:0;index" json:"created_by"`
}

func (AgentProvider) TableName() string {
	return "agent_providers"
}
