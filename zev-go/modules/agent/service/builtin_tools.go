package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"zev-go/modules/agent/engine/guardrail"
	"zev-go/modules/agent/engine/tool"
	"zev-go/pkg/datascope"
	"zev-go/pkg/perm"

	"gorm.io/gorm"
)

// BuiltinToolCatalog 返回系统内置业务工具的静态目录（供 Agent 编排界面勾选白名单）
func BuiltinToolCatalog() []tool.Meta {
	return []tool.Meta{
		{
			Name:          "system_dashboard_overview",
			Title:         "系统数据概览",
			Description:   "查询当前系统用户、角色、部门、近期操作日志和 Agent 运行总数统计（受当前用户数据权限约束）",
			Source:        "builtin",
			RiskLevel:     guardrail.RiskLow,
			RequiredPerms: []string{},
			Parameters: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			},
		},
		{
			Name:          "system_query_users",
			Title:         "查询可见用户列表",
			Description:   "按用户名或昵称关键字查询当前登录用户在 DataScope 权限范围内可见的用户摘要（自动过滤密码）",
			Source:        "builtin",
			RiskLevel:     guardrail.RiskLow,
			RequiredPerms: []string{"system:user:list"},
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"keyword": map[string]any{"type": "string", "description": "用户名或昵称关键字"},
					"limit":   map[string]any{"type": "integer", "description": "返回最大条数，默认 10，最大 20"},
				},
			},
		},
		{
			Name:          "system_query_depts",
			Title:         "查询组织部门架构",
			Description:   "查询当前登录用户在 DataScope 权限范围内可见的部门组织列表",
			Source:        "builtin",
			RiskLevel:     guardrail.RiskLow,
			RequiredPerms: []string{"system:dept:list"},
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"keyword": map[string]any{"type": "string", "description": "部门名称或编码关键字"},
				},
			},
		},
		{
			Name:          "system_query_oper_logs",
			Title:         "查询操作审计日志",
			Description:   "检索近期后台操作审计记录，用于故障排查与合规分析（受 DataScope 约束）",
			Source:        "builtin",
			RiskLevel:     guardrail.RiskMedium,
			RequiredPerms: []string{"system:operlog:list"},
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"module": map[string]any{"type": "string", "description": "业务模块关键字"},
					"status": map[string]any{"type": "integer", "description": "状态过滤：0 成功，1 失败，不传查全部"},
					"limit":  map[string]any{"type": "integer", "description": "返回最大条数，默认 10，最大 20"},
				},
			},
		},
		{
			Name:          "system_send_notice_draft",
			Title:         "创建系统通知草稿（高危）",
			Description:   "在消息中心创建一条待发布草稿公告。属于写操作且风险等级为 high，执行前必须经过管理员人工审批。",
			Source:        "builtin",
			RiskLevel:     guardrail.RiskHigh,
			RequiredPerms: []string{"system:notice:create"},
			Parameters: map[string]any{
				"type":     "object",
				"required": []string{"title", "content"},
				"properties": map[string]any{
					"title":   map[string]any{"type": "string", "description": "通知标题"},
					"content": map[string]any{"type": "string", "description": "通知正文内容"},
				},
			},
		},
	}
}

// buildScopedRegistry 按当前用户的 RBAC 权限与 DataScope 动态装配本次 Run 可用工具表（零侵入 modules/system）
func buildScopedRegistry(ctx context.Context, db *gorm.DB, scope *datascope.Scope, mcpConfigs []tool.MCPServerConfig) *tool.Registry {
	reg := tool.NewRegistry()
	permSet := loadUserPermSet(db, scope)
	hasPerm := func(required []string) bool {
		if len(required) == 0 {
			return true
		}
		if scope != nil && scope.IsSuperAdmin {
			return true
		}
		for _, p := range required {
			if _, ok := permSet[p]; ok {
				return true
			}
		}
		return false
	}

	catalog := BuiltinToolCatalog()
	metaByName := make(map[string]tool.Meta, len(catalog))
	for _, m := range catalog {
		metaByName[m.Name] = m
	}

	// 1. 系统概览统计
	if meta := metaByName["system_dashboard_overview"]; hasPerm(meta.RequiredPerms) {
		reg.Register(tool.NewFuncTool(meta, func(_ context.Context, _ map[string]any) (string, error) {
			var userCnt, deptCnt, operCnt, runCnt int64
			db.Table("users").Where("deleted_at IS NULL").Scopes(datascope.Apply(scope, datascope.Options{UserColumn: "id"})).Count(&userCnt)
			db.Table("depts").Where("deleted_at IS NULL").Scopes(datascope.Apply(scope, datascope.Options{DeptColumn: "id", UserColumn: "-"})).Count(&deptCnt)
			db.Table("sys_oper_logs").Where("deleted_at IS NULL").Scopes(datascope.Apply(scope, datascope.Options{UserColumn: "user_id"})).Count(&operCnt)
			db.Table("agent_runs").Where("deleted_at IS NULL").Scopes(datascope.Apply(scope, datascope.Options{})).Count(&runCnt)
			return marshalToolOutput(map[string]any{
				"visible_users":      userCnt,
				"visible_depts":      deptCnt,
				"visible_oper_logs":  operCnt,
				"visible_agent_runs": runCnt,
				"queried_at":         time.Now().Format(time.RFC3339),
			})
		}))
	}

	// 2. 只读用户查询（严格排除 password 字段并施加 DataScope）
	if meta := metaByName["system_query_users"]; hasPerm(meta.RequiredPerms) {
		reg.Register(tool.NewFuncTool(meta, func(_ context.Context, args map[string]any) (string, error) {
			limit := intArg(args, "limit", 10, 20)
			kw := strArg(args, "keyword")
			q := db.Table("users").
				Select("id, username, nickname, email, dept_id, status, created_at").
				Where("deleted_at IS NULL").
				Scopes(datascope.Apply(scope, datascope.Options{UserColumn: "id"}))
			if kw != "" {
				like := "%" + kw + "%"
				q = q.Where("username ILIKE ? OR nickname ILIKE ?", like, like)
			}
			var rows []map[string]any
			if err := q.Order("id ASC").Limit(limit).Find(&rows).Error; err != nil {
				return "", err
			}
			return marshalToolOutput(map[string]any{"count": len(rows), "users": rows})
		}))
	}

	// 3. 只读部门查询
	if meta := metaByName["system_query_depts"]; hasPerm(meta.RequiredPerms) {
		reg.Register(tool.NewFuncTool(meta, func(_ context.Context, args map[string]any) (string, error) {
			kw := strArg(args, "keyword")
			q := db.Table("depts").
				Select("id, parent_id, name, code, leader, status").
				Where("deleted_at IS NULL").
				Scopes(datascope.Apply(scope, datascope.Options{DeptColumn: "id", UserColumn: "-"}))
			if kw != "" {
				like := "%" + kw + "%"
				q = q.Where("name ILIKE ? OR code ILIKE ?", like, like)
			}
			var rows []map[string]any
			if err := q.Order("sort ASC, id ASC").Limit(50).Find(&rows).Error; err != nil {
				return "", err
			}
			return marshalToolOutput(map[string]any{"count": len(rows), "depts": rows})
		}))
	}

	// 4. 只读操作审计日志查询
	if meta := metaByName["system_query_oper_logs"]; hasPerm(meta.RequiredPerms) {
		reg.Register(tool.NewFuncTool(meta, func(_ context.Context, args map[string]any) (string, error) {
			limit := intArg(args, "limit", 10, 20)
			module := strArg(args, "module")
			q := db.Table("sys_oper_logs").
				Select("id, module, method, path, username, status, latency_ms, error_msg, created_at").
				Where("deleted_at IS NULL").
				Scopes(datascope.Apply(scope, datascope.Options{UserColumn: "user_id"}))
			if module != "" {
				q = q.Where("module ILIKE ?", "%"+module+"%")
			}
			if rawStatus, ok := args["status"]; ok {
				if num, ok := rawStatus.(float64); ok {
					q = q.Where("status = ?", int(num))
				}
			}
			var rows []map[string]any
			if err := q.Order("id DESC").Limit(limit).Find(&rows).Error; err != nil {
				return "", err
			}
			return marshalToolOutput(map[string]any{"count": len(rows), "logs": rows})
		}))
	}

	// 5. 高危写工具：创建通知草稿（需要审批通过后才真正执行）
	if meta := metaByName["system_send_notice_draft"]; hasPerm(meta.RequiredPerms) {
		reg.Register(tool.NewFuncTool(meta, func(_ context.Context, args map[string]any) (string, error) {
			title := strings.TrimSpace(strArg(args, "title"))
			content := strings.TrimSpace(strArg(args, "content"))
			if title == "" || content == "" {
				return "", fmt.Errorf("title 与 content 均不能为空")
			}
			var senderID, deptID uint
			if scope != nil {
				senderID = scope.UserID
				deptID = scope.DeptID
			}
			now := time.Now()
			record := map[string]any{
				"created_at":  now,
				"updated_at":  now,
				"title":       title,
				"content":     content,
				"type":        1,
				"level":       1,
				"target_type": 1,
				"target_ids":  "[]",
				"link":        "/messages",
				"status":      0, // 仅创建草稿，需人工二次审核发布
				"sender_id":   senderID,
				"dept_id":     deptID,
				"sender":      "Agent 助手",
			}
			if err := db.Table("sys_notices").Create(&record).Error; err != nil {
				return "", err
			}
			return marshalToolOutput(map[string]any{
				"created": true,
				"status":  "draft",
				"title":   title,
				"message": "已成功创建系统通知草稿，请在消息管理中审阅后发布。",
			})
		}))
	}

	// 6. 挂载已启用的外部 MCP Server 工具（失败降级跳过，不影响内置工具运行）
	for _, cfg := range mcpConfigs {
		if !cfg.Enabled || strings.TrimSpace(cfg.URL) == "" {
			continue
		}
		discoverCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		tools, err := tool.NewMCPClient(cfg).DiscoverTools(discoverCtx)
		cancel()
		if err != nil {
			continue
		}
		for _, t := range tools {
			reg.Register(t)
		}
	}

	return reg
}

func loadUserPermSet(db *gorm.DB, scope *datascope.Scope) map[string]struct{} {
	res := make(map[string]struct{})
	if db == nil || scope == nil || scope.UserID == 0 || scope.IsSuperAdmin {
		return res
	}
	_, roles, _, err := datascope.LoadUserActiveRoles(db, scope.UserID)
	if err != nil || len(roles) == 0 {
		return res
	}
	roleIDs := make([]uint, 0, len(roles))
	for _, r := range roles {
		roleIDs = append(roleIDs, r.ID)
	}
	var perms []string
	_ = db.Table("sys_role_menus").
		Select("DISTINCT menus.perms").
		Joins("JOIN menus ON menus.id = sys_role_menus.menu_id AND menus.deleted_at IS NULL").
		Where("sys_role_menus.role_id IN ? AND menus.perms <> ''", roleIDs).
		Pluck("menus.perms", &perms).Error
	for _, raw := range perms {
		for _, p := range perm.Split(raw) {
			res[p] = struct{}{}
		}
	}
	return res
}

func strArg(args map[string]any, key string) string {
	v, ok := args[key]
	if !ok || v == nil {
		return ""
	}
	s, ok := v.(string)
	if ok {
		return strings.TrimSpace(s)
	}
	return fmt.Sprint(v)
}

func intArg(args map[string]any, key string, fallback, maxVal int) int {
	v, ok := args[key]
	if !ok || v == nil {
		return fallback
	}
	n := fallback
	switch num := v.(type) {
	case float64:
		n = int(num)
	case int:
		n = num
	}
	if n <= 0 {
		return fallback
	}
	if n > maxVal {
		return maxVal
	}
	return n
}

func marshalToolOutput(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
