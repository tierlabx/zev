package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"zev-go/modules/agent/dto"
	"zev-go/modules/agent/engine/guardrail"
	"zev-go/modules/agent/engine/tool"
	"zev-go/modules/agent/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"

	"gorm.io/gorm"
)

// AgentService 负责智能体编排定义的 CRUD、策略解析与可用工具目录查询
type AgentService struct {
	*crud.BaseService[entity.AgentDefinition]
}

func NewAgentService(db *gorm.DB) *AgentService {
	return &AgentService{
		BaseService: crud.NewBaseService[entity.AgentDefinition](db),
	}
}

func (s *AgentService) List(req dto.AgentListReq, scope *datascope.Scope) ([]dto.AgentRes, int64, error) {
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	q := s.DB.Model(&entity.AgentDefinition{}).Scopes(datascope.Apply(scope, datascope.Options{}))
	if kw := strings.TrimSpace(req.Keyword); kw != "" {
		like := "%" + kw + "%"
		q = q.Where("name ILIKE ? OR code ILIKE ? OR description ILIKE ?", like, like, like)
	}
	if req.Status == "0" || req.Status == "1" {
		q = q.Where("status = ?", req.Status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []entity.AgentDefinition
	if err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	providerNames := s.loadProviderNames(rows)
	list := make([]dto.AgentRes, 0, len(rows))
	for _, row := range rows {
		list = append(list, toAgentRes(row, providerNames[row.ProviderID]))
	}
	return list, total, nil
}

func (s *AgentService) Options(scope *datascope.Scope) ([]dto.AgentOptionRes, error) {
	var rows []entity.AgentDefinition
	err := s.DB.Model(&entity.AgentDefinition{}).
		Scopes(datascope.Apply(scope, datascope.Options{})).
		Where("status = 0").
		Order("id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	providerNames := s.loadProviderNames(rows)
	res := make([]dto.AgentOptionRes, 0, len(rows))
	for _, r := range rows {
		res = append(res, dto.AgentOptionRes{
			ID:           r.ID,
			Name:         r.Name,
			Code:         r.Code,
			Model:        r.ModelName,
			ProviderName: providerNames[r.ProviderID],
			Description:  r.Description,
		})
	}
	return res, nil
}

func (s *AgentService) Get(id uint, scope *datascope.Scope) (*dto.AgentRes, error) {
	var row entity.AgentDefinition
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return nil, err
	}
	names := s.loadProviderNames([]entity.AgentDefinition{row})
	res := toAgentRes(row, names[row.ProviderID])
	return &res, nil
}

func (s *AgentService) Create(req dto.AgentCreateReq, scope *datascope.Scope) (*dto.AgentRes, error) {
	if err := validateMCPServers(req.McpServers); err != nil {
		return nil, err
	}
	var providerRow entity.AgentProvider
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&providerRow, req.ProviderID).Error; err != nil {
		return nil, errors.New("绑定的模型供应商不存在或无权访问")
	}

	maxSteps := req.MaxSteps
	if maxSteps <= 0 {
		maxSteps = 8
	}
	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 16384
	}
	modelName := strings.TrimSpace(req.Model)
	if modelName == "" {
		modelName = providerRow.DefaultModel
	}

	row := entity.AgentDefinition{
		Name:            strings.TrimSpace(req.Name),
		Code:            strings.TrimSpace(req.Code),
		Description:     strings.TrimSpace(req.Description),
		ProviderID:      req.ProviderID,
		ModelName:       modelName,
		SystemPrompt:    req.SystemPrompt,
		Temperature:     clampTemperature(req.Temperature),
		MaxSteps:        maxSteps,
		MaxTokens:       maxTokens,
		ToolWhitelist:   encodeJSONSlice(req.ToolWhitelist),
		McpServers:      encodeJSONSlice(req.McpServers),
		GuardrailConfig: encodeGuardrailPolicy(req.GuardrailConfig),
		Status:          req.Status,
	}
	if scope != nil {
		row.DeptID = scope.DeptID
		row.CreatedBy = scope.UserID
	}
	if err := s.DB.Create(&row).Error; err != nil {
		return nil, err
	}
	res := toAgentRes(row, providerRow.Name)
	return &res, nil
}

func (s *AgentService) Update(req dto.AgentUpdateReq, scope *datascope.Scope) (*dto.AgentRes, error) {
	if err := validateMCPServers(req.McpServers); err != nil {
		return nil, err
	}
	var row entity.AgentDefinition
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, req.ID).Error; err != nil {
		return nil, errors.New("智能体不存在或无权操作")
	}
	var providerRow entity.AgentProvider
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&providerRow, req.ProviderID).Error; err != nil {
		return nil, errors.New("绑定的模型供应商不存在或无权访问")
	}

	row.Name = strings.TrimSpace(req.Name)
	row.Code = strings.TrimSpace(req.Code)
	row.Description = strings.TrimSpace(req.Description)
	row.ProviderID = req.ProviderID
	row.ModelName = strings.TrimSpace(req.Model)
	if row.ModelName == "" {
		row.ModelName = providerRow.DefaultModel
	}
	row.SystemPrompt = req.SystemPrompt
	row.Temperature = clampTemperature(req.Temperature)
	if req.MaxSteps > 0 {
		row.MaxSteps = req.MaxSteps
	}
	if req.MaxTokens > 0 {
		row.MaxTokens = req.MaxTokens
	}
	row.ToolWhitelist = encodeJSONSlice(req.ToolWhitelist)
	row.McpServers = encodeJSONSlice(req.McpServers)
	row.GuardrailConfig = encodeGuardrailPolicy(req.GuardrailConfig)
	row.Status = req.Status

	if err := s.DB.Save(&row).Error; err != nil {
		return nil, err
	}
	res := toAgentRes(row, providerRow.Name)
	return &res, nil
}

func (s *AgentService) Delete(id uint, scope *datascope.Scope) error {
	var row entity.AgentDefinition
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return errors.New("智能体不存在或无权删除")
	}
	return s.DB.Delete(&row).Error
}

// ListTools 返回内置工具目录；若传入 agentId 且配置了启用的 MCP Server，会同步探测其暴露工具
func (s *AgentService) ListTools(ctx context.Context, agentID uint, scope *datascope.Scope) dto.ToolCatalogRes {
	metas := BuiltinToolCatalog()
	if agentID > 0 {
		var row entity.AgentDefinition
		if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, agentID).Error; err == nil {
			for _, cfg := range decodeMCPServers(row.McpServers) {
				if !cfg.Enabled || strings.TrimSpace(cfg.URL) == "" {
					continue
				}
				dCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
				discovered, err := tool.NewMCPClient(cfg).DiscoverTools(dCtx)
				cancel()
				if err != nil {
					continue
				}
				for _, t := range discovered {
					metas = append(metas, t.Meta())
				}
			}
		}
	}
	return dto.ToolCatalogRes{Tools: metas}
}

func (s *AgentService) loadProviderNames(rows []entity.AgentDefinition) map[uint]string {
	ids := make([]uint, 0, len(rows))
	seen := make(map[uint]struct{}, len(rows))
	for _, r := range rows {
		if r.ProviderID == 0 {
			continue
		}
		if _, ok := seen[r.ProviderID]; !ok {
			seen[r.ProviderID] = struct{}{}
			ids = append(ids, r.ProviderID)
		}
	}
	names := make(map[uint]string, len(ids))
	if len(ids) == 0 {
		return names
	}
	var providers []entity.AgentProvider
	_ = s.DB.Select("id, name").Where("id IN ?", ids).Find(&providers).Error
	for _, p := range providers {
		names[p.ID] = p.Name
	}
	return names
}

func toAgentRes(row entity.AgentDefinition, providerName string) dto.AgentRes {
	return dto.AgentRes{
		ID:              row.ID,
		Name:            row.Name,
		Code:            row.Code,
		Description:     row.Description,
		ProviderID:      row.ProviderID,
		ProviderName:    providerName,
		Model:           row.ModelName,
		SystemPrompt:    row.SystemPrompt,
		Temperature:     row.Temperature,
		MaxSteps:        row.MaxSteps,
		MaxTokens:       row.MaxTokens,
		ToolWhitelist:   decodeStringSlice(row.ToolWhitelist),
		McpServers:      decodeMCPServers(row.McpServers),
		GuardrailConfig: decodeGuardrailPolicy(row.GuardrailConfig),
		Status:          row.Status,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
	}
}

func clampTemperature(t float64) float64 {
	if t < 0 {
		return 0
	}
	if t > 2 {
		return 2
	}
	return t
}

func encodeGuardrailPolicy(p guardrail.Policy) string {
	if p.MaxInputRunes <= 0 {
		p.MaxInputRunes = 8000
	}
	if p.MaxOutputRunes <= 0 {
		p.MaxOutputRunes = 16000
	}
	raw, err := json.Marshal(p)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

func decodeGuardrailPolicy(raw string) guardrail.Policy {
	policy := guardrail.DefaultPolicy()
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "{}" {
		return policy
	}
	_ = json.Unmarshal([]byte(trimmed), &policy)
	if policy.MaxInputRunes <= 0 {
		policy.MaxInputRunes = 8000
	}
	if policy.MaxOutputRunes <= 0 {
		policy.MaxOutputRunes = 16000
	}
	return policy
}

func decodeMCPServers(raw string) []tool.MCPServerConfig {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []tool.MCPServerConfig{}
	}
	var list []tool.MCPServerConfig
	if err := json.Unmarshal([]byte(trimmed), &list); err != nil {
		return []tool.MCPServerConfig{}
	}
	return list
}

func validateMCPServers(servers []tool.MCPServerConfig) error {
	allowPrivate := tool.DefaultAllowPrivateMCP()
	for _, srv := range servers {
		if !srv.Enabled && strings.TrimSpace(srv.URL) == "" {
			continue
		}
		if err := tool.ValidateEndpointURL(srv.URL, allowPrivate); err != nil {
			return errors.New("MCP Server (" + srv.Name + ") 地址不合法: " + err.Error())
		}
	}
	return nil
}
