package provider

import "context"

const (
	TypeOpenAI    = "openai"
	TypeAnthropic = "anthropic"
	TypeGemini    = "gemini"
	TypeOllama    = "ollama"
)

// ToolCall 表示模型发起的一次工具函数调用请求
type ToolCall struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Arguments string `json:"arguments"` // JSON 对象字符串
}

// Message 统一的跨模型对话消息结构
type Message struct {
	Role       string     `json:"role"` // system / user / assistant / tool
	Content    string     `json:"content"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
	ToolName   string     `json:"tool_name,omitempty"`
}

// ToolDef 暴露给大模型的工具 Schema 描述
type ToolDef struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

// Usage 记录单次模型调用的 Token 消耗
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ChatRequest 统一推理请求参数
type ChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Tools       []ToolDef `json:"tools,omitempty"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
}

// ChatResponse 非流式或流式汇聚后的完整响应
type ChatResponse struct {
	Content          string     `json:"content"`
	ReasoningContent string     `json:"reasoning_content,omitempty"`
	ToolCalls        []ToolCall `json:"tool_calls,omitempty"`
	Usage            Usage      `json:"usage"`
	FinishReason     string     `json:"finish_reason"`
}

// StreamChunk 流式增量输出片段
type StreamChunk struct {
	DeltaContent   string
	DeltaReasoning string
	ToolCalls      []ToolCall
	Usage          *Usage
	FinishReason   string
	Done           bool
}

// Config 创建供应商客户端所需的统一连接参数
type Config struct {
	ProviderType string
	BaseURL      string
	APIKey       string
	DefaultModel string
	TimeoutSec   int
}

// Client 所有模型协议适配器实现的统一接口
type Client interface {
	Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error)
	ChatStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk) error) (*ChatResponse, error)
	Ping(ctx context.Context, model string) (int64, error)
}

// EstimateTokens 在部分兼容接口未返回 usage 时提供保守的本地 Token 估算，确保预算熔断不失效
func EstimateTokens(text string) int {
	if text == "" {
		return 0
	}
	// 混合中英文场景按约 3 字节 1 token 估算
	n := len(text) / 3
	if n < 1 {
		return 1
	}
	return n
}
