package dto

import "time"

type ProviderListReq struct {
	Page         int    `form:"page"`
	PageSize     int    `form:"pageSize"`
	Keyword      string `form:"keyword"`
	ProviderType string `form:"providerType"`
	Status       string `form:"status"`
}

type ProviderCreateReq struct {
	Name         string   `json:"name" binding:"required,max=100"`
	ProviderType string   `json:"provider_type" binding:"required,oneof=openai anthropic gemini ollama"`
	BaseURL      string   `json:"base_url" binding:"max=255"`
	APIKey       string   `json:"api_key"`
	DefaultModel string   `json:"default_model" binding:"required,max=100"`
	Models       []string `json:"models"`
	TimeoutSec   int      `json:"timeout_sec"`
	Status       int      `json:"status"`
	Remark       string   `json:"remark" binding:"max=500"`
}

type ProviderUpdateReq struct {
	ID           uint     `json:"id" binding:"required"`
	Name         string   `json:"name" binding:"required,max=100"`
	ProviderType string   `json:"provider_type" binding:"required,oneof=openai anthropic gemini ollama"`
	BaseURL      string   `json:"base_url" binding:"max=255"`
	APIKey       string   `json:"api_key"` // 留空则保持原加密密钥不变
	DefaultModel string   `json:"default_model" binding:"required,max=100"`
	Models       []string `json:"models"`
	TimeoutSec   int      `json:"timeout_sec"`
	Status       int      `json:"status"`
	Remark       string   `json:"remark" binding:"max=500"`
}

type ProviderRes struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	ProviderType string    `json:"provider_type"`
	BaseURL      string    `json:"base_url"`
	APIKeyMasked string    `json:"api_key_masked"`
	HasAPIKey    bool      `json:"has_api_key"`
	DefaultModel string    `json:"default_model"`
	Models       []string  `json:"models"`
	TimeoutSec   int       `json:"timeout_sec"`
	Status       int       `json:"status"`
	Remark       string    `json:"remark"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ProviderOptionRes struct {
	ID           uint     `json:"id"`
	Name         string   `json:"name"`
	ProviderType string   `json:"provider_type"`
	DefaultModel string   `json:"default_model"`
	Models       []string `json:"models"`
}

type ProviderPingRes struct {
	Reachable bool   `json:"reachable"`
	LatencyMs int64  `json:"latency_ms"`
	Message   string `json:"message"`
}
