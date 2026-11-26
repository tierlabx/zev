package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"zev-go/modules/agent/dto"
	agentcrypto "zev-go/modules/agent/engine/crypto"
	"zev-go/modules/agent/engine/provider"
	"zev-go/modules/agent/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"

	"gorm.io/gorm"
)

// ProviderService 负责模型网关供应商的配置管理、密钥加密持久化与连通性探活
type ProviderService struct {
	*crud.BaseService[entity.AgentProvider]
}

func NewProviderService(db *gorm.DB) *ProviderService {
	return &ProviderService{
		BaseService: crud.NewBaseService[entity.AgentProvider](db),
	}
}

func (s *ProviderService) List(req dto.ProviderListReq, scope *datascope.Scope) ([]dto.ProviderRes, int64, error) {
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	q := s.DB.Model(&entity.AgentProvider{}).Scopes(datascope.Apply(scope, datascope.Options{}))
	if kw := strings.TrimSpace(req.Keyword); kw != "" {
		like := "%" + kw + "%"
		q = q.Where("name ILIKE ? OR default_model ILIKE ? OR base_url ILIKE ?", like, like, like)
	}
	if pt := strings.TrimSpace(req.ProviderType); pt != "" {
		q = q.Where("provider_type = ?", pt)
	}
	if req.Status == "0" || req.Status == "1" {
		q = q.Where("status = ?", req.Status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []entity.AgentProvider
	if err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	list := make([]dto.ProviderRes, 0, len(rows))
	for _, row := range rows {
		list = append(list, toProviderRes(row))
	}
	return list, total, nil
}

func (s *ProviderService) Options(scope *datascope.Scope) ([]dto.ProviderOptionRes, error) {
	var rows []entity.AgentProvider
	err := s.DB.Model(&entity.AgentProvider{}).
		Scopes(datascope.Apply(scope, datascope.Options{})).
		Where("status = 0").
		Order("id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	res := make([]dto.ProviderOptionRes, 0, len(rows))
	for _, r := range rows {
		res = append(res, dto.ProviderOptionRes{
			ID:           r.ID,
			Name:         r.Name,
			ProviderType: r.ProviderType,
			DefaultModel: r.DefaultModel,
			Models:       decodeStringSlice(r.Models),
		})
	}
	return res, nil
}

func (s *ProviderService) Get(id uint, scope *datascope.Scope) (*dto.ProviderRes, error) {
	var row entity.AgentProvider
	err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error
	if err != nil {
		return nil, err
	}
	res := toProviderRes(row)
	return &res, nil
}

func (s *ProviderService) Create(req dto.ProviderCreateReq, scope *datascope.Scope) (*dto.ProviderRes, error) {
	timeout := req.TimeoutSec
	if timeout <= 0 {
		timeout = 60
	}
	encKey, err := agentcrypto.Encrypt(strings.TrimSpace(req.APIKey), "")
	if err != nil {
		return nil, err
	}

	row := entity.AgentProvider{
		Name:            strings.TrimSpace(req.Name),
		ProviderType:    strings.ToLower(strings.TrimSpace(req.ProviderType)),
		BaseURL:         defaultBaseURL(req.ProviderType, req.BaseURL),
		APIKeyEncrypted: encKey,
		APIKeyMasked:    agentcrypto.MaskSecret(req.APIKey),
		DefaultModel:    strings.TrimSpace(req.DefaultModel),
		Models:          encodeJSONSlice(ensureDefaultModelInList(req.DefaultModel, req.Models)),
		TimeoutSec:      timeout,
		Status:          req.Status,
		Remark:          strings.TrimSpace(req.Remark),
	}
	if scope != nil {
		row.DeptID = scope.DeptID
		row.CreatedBy = scope.UserID
	}
	if err := s.DB.Create(&row).Error; err != nil {
		return nil, err
	}
	res := toProviderRes(row)
	return &res, nil
}

func (s *ProviderService) Update(req dto.ProviderUpdateReq, scope *datascope.Scope) (*dto.ProviderRes, error) {
	var row entity.AgentProvider
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, req.ID).Error; err != nil {
		return nil, errors.New("模型供应商不存在或无权操作")
	}

	row.Name = strings.TrimSpace(req.Name)
	row.ProviderType = strings.ToLower(strings.TrimSpace(req.ProviderType))
	row.BaseURL = defaultBaseURL(req.ProviderType, req.BaseURL)
	row.DefaultModel = strings.TrimSpace(req.DefaultModel)
	row.Models = encodeJSONSlice(ensureDefaultModelInList(req.DefaultModel, req.Models))
	if req.TimeoutSec > 0 {
		row.TimeoutSec = req.TimeoutSec
	}
	row.Status = req.Status
	row.Remark = strings.TrimSpace(req.Remark)

	// 仅当管理员显式传入新 API Key 时才覆盖已加密凭据，避免前端编辑表单置空密钥
	if trimmedKey := strings.TrimSpace(req.APIKey); trimmedKey != "" {
		encKey, err := agentcrypto.Encrypt(trimmedKey, "")
		if err != nil {
			return nil, err
		}
		row.APIKeyEncrypted = encKey
		row.APIKeyMasked = agentcrypto.MaskSecret(trimmedKey)
	}

	if err := s.DB.Save(&row).Error; err != nil {
		return nil, err
	}
	res := toProviderRes(row)
	return &res, nil
}

func (s *ProviderService) Delete(id uint, scope *datascope.Scope) error {
	var row entity.AgentProvider
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return errors.New("模型供应商不存在或无权删除")
	}
	var refCount int64
	if err := s.DB.Model(&entity.AgentDefinition{}).Where("provider_id = ?", id).Count(&refCount).Error; err != nil {
		return err
	}
	if refCount > 0 {
		return errors.New("该供应商已被智能体引用，请先解绑后再删除")
	}
	return s.DB.Delete(&row).Error
}

// BuildClient 解密供应商凭据并构造带重试与熔断的统一推理客户端
func (s *ProviderService) BuildClient(row *entity.AgentProvider) (provider.Client, error) {
	if row == nil {
		return nil, errors.New("未找到模型供应商")
	}
	if row.Status != 0 {
		return nil, errors.New("所选模型供应商已被禁用")
	}
	apiKey, err := agentcrypto.Decrypt(row.APIKeyEncrypted, "")
	if err != nil {
		return nil, errors.New("解密供应商 API Key 失败，请重新保存密钥")
	}
	return provider.NewClient(provider.Config{
		ProviderType: row.ProviderType,
		BaseURL:      row.BaseURL,
		APIKey:       apiKey,
		DefaultModel: row.DefaultModel,
		TimeoutSec:   row.TimeoutSec,
	})
}

func (s *ProviderService) Ping(ctx context.Context, id uint, scope *datascope.Scope) (*dto.ProviderPingRes, error) {
	var row entity.AgentProvider
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return nil, errors.New("模型供应商不存在或无权访问")
	}
	client, err := s.BuildClient(&row)
	if err != nil {
		return &dto.ProviderPingRes{Reachable: false, Message: err.Error()}, nil
	}
	latency, pingErr := client.Ping(ctx, row.DefaultModel)
	if pingErr != nil {
		return &dto.ProviderPingRes{
			Reachable: false,
			LatencyMs: latency,
			Message:   pingErr.Error(),
		}, nil
	}
	return &dto.ProviderPingRes{
		Reachable: true,
		LatencyMs: latency,
		Message:   "连接正常",
	}, nil
}

func toProviderRes(row entity.AgentProvider) dto.ProviderRes {
	return dto.ProviderRes{
		ID:           row.ID,
		Name:         row.Name,
		ProviderType: row.ProviderType,
		BaseURL:      row.BaseURL,
		APIKeyMasked: row.APIKeyMasked,
		HasAPIKey:    row.APIKeyEncrypted != "",
		DefaultModel: row.DefaultModel,
		Models:       decodeStringSlice(row.Models),
		TimeoutSec:   row.TimeoutSec,
		Status:       row.Status,
		Remark:       row.Remark,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	}
}

func defaultBaseURL(providerType, custom string) string {
	if trimmed := strings.TrimRight(strings.TrimSpace(custom), "/"); trimmed != "" {
		return trimmed
	}
	switch strings.ToLower(strings.TrimSpace(providerType)) {
	case provider.TypeAnthropic:
		return "https://api.anthropic.com"
	case provider.TypeGemini:
		return "https://generativelanguage.googleapis.com/v1beta"
	case provider.TypeOllama:
		return "http://localhost:11434/v1"
	default:
		return "https://api.openai.com/v1"
	}
}

func ensureDefaultModelInList(defaultModel string, models []string) []string {
	seen := make(map[string]struct{}, len(models)+1)
	res := make([]string, 0, len(models)+1)
	if dm := strings.TrimSpace(defaultModel); dm != "" {
		seen[dm] = struct{}{}
		res = append(res, dm)
	}
	for _, m := range models {
		trimmed := strings.TrimSpace(m)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; !ok {
			seen[trimmed] = struct{}{}
			res = append(res, trimmed)
		}
	}
	return res
}

func normalizePagination(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	} else if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

func encodeJSONSlice[T any](items []T) string {
	if len(items) == 0 {
		return "[]"
	}
	raw, err := json.Marshal(items)
	if err != nil {
		return "[]"
	}
	return string(raw)
}

func decodeStringSlice(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []string{}
	}
	var items []string
	if err := json.Unmarshal([]byte(trimmed), &items); err != nil {
		return []string{}
	}
	return items
}
