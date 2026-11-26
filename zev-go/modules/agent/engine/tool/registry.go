package tool

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"sort"
	"sync"

	"zev-go/modules/agent/engine/provider"
)

// Meta 描述单个可注册工具的静态元信息，供前端工具目录与权限判定使用
type Meta struct {
	Name          string         `json:"name"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Source        string         `json:"source"` // builtin / mcp
	RiskLevel     string         `json:"risk_level"`
	RequiredPerms []string       `json:"required_perms"`
	Parameters    map[string]any `json:"parameters"`
}

// Tool 定义 Agent 可调用工具的统一接口
type Tool interface {
	Meta() Meta
	Execute(ctx context.Context, argsJSON string) (string, error)
}

// FuncTool 基于闭包的轻量工具适配器，便于业务服务层快速注入带上下文的工具
type FuncTool struct {
	meta Meta
	fn   func(ctx context.Context, args map[string]any) (string, error)
}

func NewFuncTool(meta Meta, fn func(ctx context.Context, args map[string]any) (string, error)) *FuncTool {
	return &FuncTool{meta: meta, fn: fn}
}

func (t *FuncTool) Meta() Meta {
	return t.meta
}

func (t *FuncTool) Execute(ctx context.Context, argsJSON string) (string, error) {
	args := make(map[string]any)
	if argsJSON != "" {
		if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
			return "", fmt.Errorf("工具参数不是合法 JSON: %w", err)
		}
	}
	return t.fn(ctx, args)
}

// Registry 线程安全地管理单次会话或全局可用的工具集合
type Registry struct {
	mu    sync.RWMutex
	tools map[string]Tool
}

func NewRegistry() *Registry {
	return &Registry{
		tools: make(map[string]Tool),
	}
}

func (r *Registry) Register(t Tool) {
	if t == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tools[t.Meta().Name] = t
}

func (r *Registry) Get(name string) (Tool, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.tools[name]
	return t, ok
}

// ListMeta 返回按名称排序的工具元数据列表
func (r *Registry) ListMeta() []Meta {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := make([]Meta, 0, len(r.tools))
	for _, t := range r.tools {
		res = append(res, t.Meta())
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}

// FilterForModel 根据白名单筛选出可暴露给大模型的 ToolDef 列表
func (r *Registry) FilterForModel(whitelist []string) []provider.ToolDef {
	metas := r.ListMeta()
	defs := make([]provider.ToolDef, 0, len(metas))
	for _, m := range metas {
		if len(whitelist) > 0 && !slices.Contains(whitelist, m.Name) {
			continue
		}
		defs = append(defs, provider.ToolDef{
			Name:        m.Name,
			Description: m.Description,
			Parameters:  m.Parameters,
		})
	}
	return defs
}
