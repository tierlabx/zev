package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"

	"zev-go/modules/agent/dto"
	"zev-go/modules/agent/engine/guardrail"
	"zev-go/modules/agent/engine/provider"
	agentrt "zev-go/modules/agent/engine/runtime"
	"zev-go/modules/agent/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"
	"zev-go/pkg/logger"

	"gorm.io/gorm"
)

// RunService 编排 Agent 执行会话生命周期、全链路 Span 持久化、取消控制与 Trace 检索
type RunService struct {
	*crud.BaseService[entity.AgentRun]
	providerSvc *ProviderService
	approvalSvc *ApprovalService

	mu      sync.Mutex
	cancels map[uint]context.CancelFunc
}

func NewRunService(db *gorm.DB, providerSvc *ProviderService, approvalSvc *ApprovalService) *RunService {
	return &RunService{
		BaseService: crud.NewBaseService[entity.AgentRun](db),
		providerSvc: providerSvc,
		approvalSvc: approvalSvc,
		cancels:     make(map[uint]context.CancelFunc),
	}
}

// ExecuteStream 启动一次流式交互 Run，完整记录 Span 并支持高危工具挂起审批与实时 SSE 推送
func (s *RunService) ExecuteStream(
	ctx context.Context,
	req dto.RunStreamReq,
	scope *datascope.Scope,
	username string,
	onEvent func(agentrt.Event),
) (*dto.RunRes, error) {
	return s.executeInternal(ctx, req, scope, username, true, onEvent)
}

// ExecuteHeadless 以离线无审批模式运行一次 Agent，供自动化 Eval 评测回归调用
func (s *RunService) ExecuteHeadless(
	ctx context.Context,
	agentID uint,
	input string,
	scope *datascope.Scope,
) (*dto.RunRes, string, error) {
	var finalOutput string
	res, err := s.executeInternal(ctx, dto.RunStreamReq{
		AgentID: agentID,
		Input:   input,
	}, scope, "eval-runner", false, func(evt agentrt.Event) {
		if evt.Type == agentrt.EventCompleted {
			finalOutput = evt.Content
		}
	})
	if err != nil {
		return nil, "", err
	}
	if finalOutput == "" && res != nil {
		finalOutput = res.OutputSummary
	}
	return res, finalOutput, nil
}

func (s *RunService) executeInternal(
	parentCtx context.Context,
	req dto.RunStreamReq,
	scope *datascope.Scope,
	username string,
	allowApproval bool,
	onEvent func(agentrt.Event),
) (*dto.RunRes, error) {
	var agentRow entity.AgentDefinition
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&agentRow, req.AgentID).Error; err != nil {
		return nil, errors.New("智能体不存在或无权访问")
	}
	if agentRow.Status != 0 {
		return nil, errors.New("当前智能体已禁用")
	}

	var providerRow entity.AgentProvider
	if err := s.DB.First(&providerRow, agentRow.ProviderID).Error; err != nil {
		return nil, errors.New("未找到智能体绑定的模型供应商")
	}
	client, err := s.providerSvc.BuildClient(&providerRow)
	if err != nil {
		return nil, err
	}

	modelName := strings.TrimSpace(agentRow.ModelName)
	if modelName == "" {
		modelName = providerRow.DefaultModel
	}

	runRow := entity.AgentRun{
		AgentID:      agentRow.ID,
		AgentName:    agentRow.Name,
		ProviderID:   providerRow.ID,
		ModelName:    modelName,
		Status:       "running",
		InputSummary: logger.TruncateString(guardrail.SanitizeText(strings.TrimSpace(req.Input)), 480),
	}
	if scope != nil {
		runRow.DeptID = scope.DeptID
		runRow.CreatedBy = scope.UserID
	}
	if err := s.DB.Create(&runRow).Error; err != nil {
		return nil, err
	}

	runCtx, cancel := context.WithCancel(parentCtx)
	s.registerCancel(runRow.ID, cancel)
	defer func() {
		s.unregisterCancel(runRow.ID)
		cancel()
	}()

	policy := decodeGuardrailPolicy(agentRow.GuardrailConfig)
	mcpConfigs := decodeMCPServers(agentRow.McpServers)
	toolsReg := buildScopedRegistry(runCtx, s.DB, scope, mcpConfigs)

	rtCfg := agentrt.RunConfig{
		RunID:           runRow.ID,
		Model:           modelName,
		SystemPrompt:    agentRow.SystemPrompt,
		History:         req.History,
		UserInput:       req.Input,
		Temperature:     agentRow.Temperature,
		MaxSteps:        agentRow.MaxSteps,
		MaxTokensBudget: agentRow.MaxTokens,
		ToolWhitelist:   decodeStringSlice(agentRow.ToolWhitelist),
		ApprovalTimeout: defaultApprovalTTL,
		Client:          client,
		Tools:           toolsReg,
		Guardrail:       guardrail.NewEngine(policy),
		OnEvent:         onEvent,
		OnSpan: func(sp agentrt.SpanRecord) {
			ended := sp.EndedAt
			row := entity.AgentRunSpan{
				RunID:        runRow.ID,
				SpanType:     sp.SpanType,
				Name:         sp.Name,
				Status:       sp.Status,
				InputJSON:    sp.InputJSON,
				OutputJSON:   sp.OutputJSON,
				Tokens:       sp.Tokens,
				StartedAt:    sp.StartedAt,
				EndedAt:      &ended,
				DurationMs:   sp.DurationMs,
				ErrorMessage: logger.TruncateString(sp.ErrorMessage, 960),
			}
			_ = s.DB.Create(&row).Error
		},
	}

	if allowApproval && s.approvalSvc != nil {
		rtCfg.Broker = s.approvalSvc.Broker()
		rtCfg.OnRequestApproval = func(_ context.Context, info agentrt.ApprovalRequestInfo) (uint, any, error) {
			_ = s.DB.Model(&entity.AgentRun{}).Where("id = ?", runRow.ID).Update("status", "waiting_approval").Error
			appRes, err := s.approvalSvc.CreateAndNotify(
				runRow.ID, agentRow.ID, agentRow.Name,
				info.ToolName, info.SanitizedArg, info.RiskLevel, info.Reason,
				username, scope,
			)
			if err != nil {
				return 0, nil, err
			}
			return appRes.ID, appRes, nil
		}
		rtCfg.OnApprovalFinished = func(approvalID uint, status string) {
			if status == "expired" || status == "cancelled" {
				s.approvalSvc.UpdatePendingStatus(approvalID, status)
			}
			if status != "cancelled" {
				_ = s.DB.Model(&entity.AgentRun{}).
					Where("id = ? AND status = ?", runRow.ID, "waiting_approval").
					Update("status", "running").Error
			}
		}
	}

	rtRes := agentrt.Execute(runCtx, rtCfg)

	msgRaw, _ := json.Marshal(rtRes.Messages)
	runRow.Status = rtRes.Status
	runRow.OutputSummary = logger.TruncateString(rtRes.FinalOutput, 960)
	runRow.MessagesJSON = string(msgRaw)
	runRow.StepCount = rtRes.StepCount
	runRow.PromptTokens = rtRes.PromptTokens
	runRow.CompletionTokens = rtRes.CompletionTokens
	runRow.TotalTokens = rtRes.TotalTokens
	runRow.DurationMs = rtRes.DurationMs
	runRow.ErrorMessage = logger.TruncateString(rtRes.ErrorMessage, 960)
	_ = s.DB.Save(&runRow).Error

	res := toRunRes(runRow)
	return &res, nil
}

func (s *RunService) Cancel(id uint, scope *datascope.Scope) error {
	var row entity.AgentRun
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return errors.New("运行记录不存在或无权操作")
	}
	s.mu.Lock()
	cancel, ok := s.cancels[id]
	s.mu.Unlock()
	if ok {
		cancel()
	}
	if row.Status == "running" || row.Status == "waiting_approval" {
		_ = s.DB.Model(&row).Updates(map[string]any{
			"status":        "cancelled",
			"error_message": "已由用户手动取消",
		}).Error
		if s.approvalSvc != nil {
			s.approvalSvc.CancelPendingByRunID(id)
		}
	}
	return nil
}

func (s *RunService) List(req dto.RunListReq, scope *datascope.Scope) ([]dto.RunRes, int64, error) {
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	q := s.DB.Model(&entity.AgentRun{}).Scopes(datascope.Apply(scope, datascope.Options{}))
	if req.AgentID > 0 {
		q = q.Where("agent_id = ?", req.AgentID)
	}
	if st := strings.TrimSpace(req.Status); st != "" {
		q = q.Where("status = ?", st)
	}
	if kw := strings.TrimSpace(req.Keyword); kw != "" {
		like := "%" + kw + "%"
		q = q.Where("agent_name ILIKE ? OR input_summary ILIKE ? OR output_summary ILIKE ?", like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []entity.AgentRun
	if err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	list := make([]dto.RunRes, 0, len(rows))
	for _, r := range rows {
		list = append(list, toRunRes(r))
	}
	return list, total, nil
}

func (s *RunService) Detail(id uint, scope *datascope.Scope) (*dto.RunDetailRes, error) {
	var row entity.AgentRun
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return nil, errors.New("执行轨迹不存在或无权访问")
	}
	var spanRows []entity.AgentRunSpan
	if err := s.DB.Where("run_id = ?", row.ID).Order("started_at ASC, id ASC").Find(&spanRows).Error; err != nil {
		return nil, err
	}

	var msgs []provider.Message
	if strings.TrimSpace(row.MessagesJSON) != "" {
		_ = json.Unmarshal([]byte(row.MessagesJSON), &msgs)
	}
	if msgs == nil {
		msgs = []provider.Message{}
	}

	spans := make([]dto.RunSpanRes, 0, len(spanRows))
	for _, sp := range spanRows {
		spans = append(spans, dto.RunSpanRes{
			ID:           sp.ID,
			RunID:        sp.RunID,
			ParentSpanID: sp.ParentSpanID,
			SpanType:     sp.SpanType,
			Name:         sp.Name,
			Status:       sp.Status,
			InputJSON:    sp.InputJSON,
			OutputJSON:   sp.OutputJSON,
			Tokens:       sp.Tokens,
			StartedAt:    sp.StartedAt,
			EndedAt:      sp.EndedAt,
			DurationMs:   sp.DurationMs,
			ErrorMessage: sp.ErrorMessage,
		})
	}
	return &dto.RunDetailRes{
		Run:      toRunRes(row),
		Messages: msgs,
		Spans:    spans,
	}, nil
}

// RecentHeartbeats 返回近期最多 30 条执行心跳快照，供前端 Tracker 状态条展示
func (s *RunService) RecentHeartbeats(scope *datascope.Scope) ([]dto.RunHeartbeatRes, error) {
	var rows []entity.AgentRun
	err := s.DB.Model(&entity.AgentRun{}).
		Select("id, status, agent_name, duration_ms, created_at").
		Scopes(datascope.Apply(scope, datascope.Options{})).
		Order("id DESC").
		Limit(30).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	// 反转为时间正序（左旧右新）
	res := make([]dto.RunHeartbeatRes, 0, len(rows))
	for i := len(rows) - 1; i >= 0; i-- {
		r := rows[i]
		res = append(res, dto.RunHeartbeatRes{
			RunID:      r.ID,
			Status:     r.Status,
			AgentName:  r.AgentName,
			DurationMs: r.DurationMs,
			CreatedAt:  r.CreatedAt,
		})
	}
	return res, nil
}

func (s *RunService) registerCancel(runID uint, cancel context.CancelFunc) {
	s.mu.Lock()
	s.cancels[runID] = cancel
	s.mu.Unlock()
}

func (s *RunService) unregisterCancel(runID uint) {
	s.mu.Lock()
	delete(s.cancels, runID)
	s.mu.Unlock()
}

func toRunRes(row entity.AgentRun) dto.RunRes {
	return dto.RunRes{
		ID:               row.ID,
		AgentID:          row.AgentID,
		AgentName:        row.AgentName,
		ProviderID:       row.ProviderID,
		Model:            row.ModelName,
		Status:           row.Status,
		InputSummary:     row.InputSummary,
		OutputSummary:    row.OutputSummary,
		StepCount:        row.StepCount,
		PromptTokens:     row.PromptTokens,
		CompletionTokens: row.CompletionTokens,
		TotalTokens:      row.TotalTokens,
		DurationMs:       row.DurationMs,
		ErrorMessage:     row.ErrorMessage,
		CreatedBy:        row.CreatedBy,
		CreatedAt:        row.CreatedAt,
	}
}
