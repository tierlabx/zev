package service

import (
	"context"
	"errors"
	"log/slog"
	"math"
	"strings"
	"time"

	"zev-go/modules/agent/dto"
	"zev-go/modules/agent/engine/evaluator"
	"zev-go/modules/agent/engine/provider"
	"zev-go/modules/agent/entity"
	"zev-go/pkg/datascope"

	"gorm.io/gorm"
)

// EvalService 负责评测数据集、用例管理、回归评测批次调度与发布门禁判定
type EvalService struct {
	db          *gorm.DB
	providerSvc *ProviderService
	runSvc      *RunService
}

func NewEvalService(db *gorm.DB, providerSvc *ProviderService, runSvc *RunService) *EvalService {
	return &EvalService{
		db:          db,
		providerSvc: providerSvc,
		runSvc:      runSvc,
	}
}

func (s *EvalService) ListDatasets(req dto.EvalDatasetListReq, scope *datascope.Scope) ([]dto.EvalDatasetRes, int64, error) {
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	q := s.db.Model(&entity.AgentEvalDataset{}).Scopes(datascope.Apply(scope, datascope.Options{}))
	if kw := strings.TrimSpace(req.Keyword); kw != "" {
		like := "%" + kw + "%"
		q = q.Where("name ILIKE ? OR description ILIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []entity.AgentEvalDataset
	if err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	list := make([]dto.EvalDatasetRes, 0, len(rows))
	for _, r := range rows {
		list = append(list, s.buildDatasetRes(r))
	}
	return list, total, nil
}

func (s *EvalService) CreateDataset(req dto.EvalDatasetCreateReq, scope *datascope.Scope) (*dto.EvalDatasetRes, error) {
	var agentRow entity.AgentDefinition
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&agentRow, req.AgentID).Error; err != nil {
		return nil, errors.New("目标智能体不存在或无权访问")
	}
	threshold := clampRate(req.PassThreshold, 0.8)
	row := entity.AgentEvalDataset{
		Name:          strings.TrimSpace(req.Name),
		Description:   strings.TrimSpace(req.Description),
		AgentID:       req.AgentID,
		PassThreshold: threshold,
	}
	if scope != nil {
		row.DeptID = scope.DeptID
		row.CreatedBy = scope.UserID
	}
	if err := s.db.Create(&row).Error; err != nil {
		return nil, err
	}
	res := s.buildDatasetRes(row)
	return &res, nil
}

func (s *EvalService) UpdateDataset(req dto.EvalDatasetUpdateReq, scope *datascope.Scope) (*dto.EvalDatasetRes, error) {
	var row entity.AgentEvalDataset
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, req.ID).Error; err != nil {
		return nil, errors.New("评测集不存在或无权操作")
	}
	row.Name = strings.TrimSpace(req.Name)
	row.Description = strings.TrimSpace(req.Description)
	row.AgentID = req.AgentID
	row.PassThreshold = clampRate(req.PassThreshold, row.PassThreshold)
	if err := s.db.Save(&row).Error; err != nil {
		return nil, err
	}
	res := s.buildDatasetRes(row)
	return &res, nil
}

func (s *EvalService) DeleteDataset(id uint, scope *datascope.Scope) error {
	var row entity.AgentEvalDataset
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return errors.New("评测集不存在或无权删除")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("dataset_id = ?", id).Delete(&entity.AgentEvalCase{}).Error; err != nil {
			return err
		}
		return tx.Delete(&row).Error
	})
}

func (s *EvalService) ListCases(datasetID uint, scope *datascope.Scope) ([]dto.EvalCaseRes, error) {
	var ds entity.AgentEvalDataset
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&ds, datasetID).Error; err != nil {
		return nil, errors.New("评测集不存在或无权访问")
	}
	var rows []entity.AgentEvalCase
	if err := s.db.Where("dataset_id = ?", datasetID).Order("sort ASC, id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	res := make([]dto.EvalCaseRes, 0, len(rows))
	for _, r := range rows {
		res = append(res, toEvalCaseRes(r))
	}
	return res, nil
}

func (s *EvalService) CreateCase(req dto.EvalCaseCreateReq, scope *datascope.Scope) (*dto.EvalCaseRes, error) {
	var ds entity.AgentEvalDataset
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&ds, req.DatasetID).Error; err != nil {
		return nil, errors.New("评测集不存在或无权访问")
	}
	row := entity.AgentEvalCase{
		DatasetID:          req.DatasetID,
		Name:               strings.TrimSpace(req.Name),
		Input:              req.Input,
		ExpectedPattern:    strings.TrimSpace(req.ExpectedPattern),
		ExpectedJSONSchema: strings.TrimSpace(req.ExpectedJSONSchema),
		JudgeCriteria:      strings.TrimSpace(req.JudgeCriteria),
		Tags:               strings.TrimSpace(req.Tags),
		Sort:               req.Sort,
	}
	if err := s.db.Create(&row).Error; err != nil {
		return nil, err
	}
	res := toEvalCaseRes(row)
	return &res, nil
}

func (s *EvalService) UpdateCase(req dto.EvalCaseUpdateReq, scope *datascope.Scope) (*dto.EvalCaseRes, error) {
	var row entity.AgentEvalCase
	if err := s.db.First(&row, req.ID).Error; err != nil {
		return nil, errors.New("评测用例不存在")
	}
	var ds entity.AgentEvalDataset
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&ds, row.DatasetID).Error; err != nil {
		return nil, errors.New("无权操作该评测集下的用例")
	}
	row.Name = strings.TrimSpace(req.Name)
	row.Input = req.Input
	row.ExpectedPattern = strings.TrimSpace(req.ExpectedPattern)
	row.ExpectedJSONSchema = strings.TrimSpace(req.ExpectedJSONSchema)
	row.JudgeCriteria = strings.TrimSpace(req.JudgeCriteria)
	row.Tags = strings.TrimSpace(req.Tags)
	row.Sort = req.Sort
	if err := s.db.Save(&row).Error; err != nil {
		return nil, err
	}
	res := toEvalCaseRes(row)
	return &res, nil
}

func (s *EvalService) DeleteCase(id uint, scope *datascope.Scope) error {
	var row entity.AgentEvalCase
	if err := s.db.First(&row, id).Error; err != nil {
		return errors.New("评测用例不存在")
	}
	var ds entity.AgentEvalDataset
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&ds, row.DatasetID).Error; err != nil {
		return errors.New("无权删除该评测集下的用例")
	}
	return s.db.Delete(&row).Error
}

// RecoverStaleRuns 在服务启动时清理因进程意外中断遗留的 running 评测批次，避免前端无限轮询
func (s *EvalService) RecoverStaleRuns() {
	now := time.Now()
	_ = s.db.Model(&entity.AgentEvalRun{}).
		Where("status = ?", "running").
		Updates(map[string]any{
			"status":       "failed",
			"completed_at": &now,
		}).Error
}

// ExecuteDataset 异步触发指定评测集的回归评测并立即返回运行中批次信息，防止 HTTP 长阻塞超时
func (s *EvalService) ExecuteDataset(_ context.Context, datasetID uint, scope *datascope.Scope) (*dto.EvalRunDetailRes, error) {
	var ds entity.AgentEvalDataset
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&ds, datasetID).Error; err != nil {
		return nil, errors.New("评测集不存在或无权访问")
	}
	var agentRow entity.AgentDefinition
	if err := s.db.First(&agentRow, ds.AgentID).Error; err != nil {
		return nil, errors.New("关联的智能体不存在")
	}
	var cases []entity.AgentEvalCase
	if err := s.db.Where("dataset_id = ?", ds.ID).Order("sort ASC, id ASC").Find(&cases).Error; err != nil {
		return nil, err
	}
	if len(cases) == 0 {
		return nil, errors.New("当前评测集尚无用例，请先添加评测用例")
	}

	var judgeClient provider.Client
	judgeModel := agentRow.ModelName
	var providerRow entity.AgentProvider
	if err := s.db.First(&providerRow, agentRow.ProviderID).Error; err == nil {
		if c, err := s.providerSvc.BuildClient(&providerRow); err == nil {
			judgeClient = c
		}
		if judgeModel == "" {
			judgeModel = providerRow.DefaultModel
		}
	}

	evalRun := entity.AgentEvalRun{
		DatasetID:  ds.ID,
		AgentID:    agentRow.ID,
		AgentName:  agentRow.Name,
		Status:     "running",
		TotalCases: len(cases),
	}
	if scope != nil {
		evalRun.DeptID = scope.DeptID
		evalRun.CreatedBy = scope.UserID
	}
	if err := s.db.Create(&evalRun).Error; err != nil {
		return nil, err
	}

	var scopeCopy *datascope.Scope
	if scope != nil {
		cp := *scope
		scopeCopy = &cp
	}
	go s.runEvalAsync(evalRun, ds, agentRow, cases, judgeClient, judgeModel, scopeCopy)

	return &dto.EvalRunDetailRes{
		Run:     toEvalRunRes(evalRun),
		Results: []dto.EvalCaseResultRes{},
	}, nil
}

func (s *EvalService) runEvalAsync(
	evalRun entity.AgentEvalRun,
	ds entity.AgentEvalDataset,
	agentRow entity.AgentDefinition,
	cases []entity.AgentEvalCase,
	judgeClient provider.Client,
	judgeModel string,
	scope *datascope.Scope,
) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	defer func() {
		if r := recover(); r != nil {
			slog.Error("异步回归评测发生 panic", "evalRunID", evalRun.ID, "panic", r)
			now := time.Now()
			_ = s.db.Model(&entity.AgentEvalRun{}).Where("id = ?", evalRun.ID).Updates(map[string]any{
				"status":       "failed",
				"completed_at": &now,
			}).Error
		}
	}()

	passed := 0
	var totalLatency int64
	totalTokens := 0

	for idx, c := range cases {
		runRes, actualOutput, runErr := s.runSvc.ExecuteHeadless(ctx, agentRow.ID, c.Input, scope)
		var runID uint
		var latency int64
		var tokens int
		if runRes != nil {
			runID = runRes.ID
			latency = runRes.DurationMs
			tokens = runRes.TotalTokens
		}

		var outcome evaluator.EvalOutcome
		if runErr != nil {
			outcome = evaluator.EvalOutcome{
				Passed:          false,
				Score:           0,
				AssertionDetail: "智能体运行异常: " + runErr.Error(),
			}
		} else {
			outcome = evaluator.Evaluate(ctx, evaluator.CaseSpec{
				Input:              c.Input,
				ExpectedPattern:    c.ExpectedPattern,
				ExpectedJSONSchema: c.ExpectedJSONSchema,
				JudgeCriteria:      c.JudgeCriteria,
			}, actualOutput, judgeClient, judgeModel)
		}

		if outcome.Passed {
			passed++
		}
		totalLatency += latency
		totalTokens += tokens

		rec := entity.AgentEvalCaseResult{
			EvalRunID:       evalRun.ID,
			CaseID:          c.ID,
			CaseName:        c.Name,
			RunID:           runID,
			Passed:          outcome.Passed,
			Score:           outcome.Score,
			ActualOutput:    actualOutput,
			AssertionDetail: outcome.AssertionDetail,
			JudgeReason:     outcome.JudgeReason,
			LatencyMs:       latency,
			Tokens:          tokens,
		}
		_ = s.db.Create(&rec).Error

		completedCases := idx + 1
		currentRate := float64(passed) / float64(completedCases)
		_ = s.db.Model(&entity.AgentEvalRun{}).Where("id = ?", evalRun.ID).Updates(map[string]any{
			"passed_cases":   passed,
			"failed_cases":   completedCases - passed,
			"pass_rate":      math.Round(currentRate*10000) / 10000,
			"avg_latency_ms": totalLatency / int64(completedCases),
			"total_tokens":   totalTokens,
		}).Error
	}

	now := time.Now()
	passRate := float64(passed) / float64(len(cases))
	_ = s.db.Model(&entity.AgentEvalRun{}).Where("id = ?", evalRun.ID).Updates(map[string]any{
		"status":         "completed",
		"passed_cases":   passed,
		"failed_cases":   len(cases) - passed,
		"pass_rate":      math.Round(passRate*10000) / 10000,
		"gate_passed":    passRate >= ds.PassThreshold,
		"avg_latency_ms": totalLatency / int64(len(cases)),
		"total_tokens":   totalTokens,
		"completed_at":   &now,
	}).Error
}

func (s *EvalService) ListRuns(req dto.EvalRunListReq, scope *datascope.Scope) ([]dto.EvalRunRes, int64, error) {
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	q := s.db.Model(&entity.AgentEvalRun{}).Scopes(datascope.Apply(scope, datascope.Options{}))
	if req.DatasetID > 0 {
		q = q.Where("dataset_id = ?", req.DatasetID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []entity.AgentEvalRun
	if err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	list := make([]dto.EvalRunRes, 0, len(rows))
	for _, r := range rows {
		list = append(list, toEvalRunRes(r))
	}
	return list, total, nil
}

func (s *EvalService) GetRunDetail(id uint, scope *datascope.Scope) (*dto.EvalRunDetailRes, error) {
	var runRow entity.AgentEvalRun
	if err := s.db.Scopes(datascope.Apply(scope, datascope.Options{})).First(&runRow, id).Error; err != nil {
		return nil, errors.New("评测报告不存在或无权访问")
	}
	var rows []entity.AgentEvalCaseResult
	if err := s.db.Where("eval_run_id = ?", runRow.ID).Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	results := make([]dto.EvalCaseResultRes, 0, len(rows))
	for _, r := range rows {
		results = append(results, toEvalCaseResultRes(r))
	}
	return &dto.EvalRunDetailRes{
		Run:     toEvalRunRes(runRow),
		Results: results,
	}, nil
}

func (s *EvalService) buildDatasetRes(row entity.AgentEvalDataset) dto.EvalDatasetRes {
	var agentName string
	_ = s.db.Model(&entity.AgentDefinition{}).Select("name").Where("id = ?", row.AgentID).Scan(&agentName).Error
	var caseCount int64
	_ = s.db.Model(&entity.AgentEvalCase{}).Where("dataset_id = ?", row.ID).Count(&caseCount).Error

	var recentRuns []entity.AgentEvalRun
	_ = s.db.Where("dataset_id = ? AND status = ?", row.ID, "completed").Order("id DESC").Limit(2).Find(&recentRuns).Error

	res := dto.EvalDatasetRes{
		ID:            row.ID,
		Name:          row.Name,
		Description:   row.Description,
		AgentID:       row.AgentID,
		AgentName:     agentName,
		PassThreshold: row.PassThreshold,
		CaseCount:     caseCount,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
	if len(recentRuns) > 0 {
		rate := recentRuns[0].PassRate
		gate := recentRuns[0].GatePassed
		res.LatestPassRate = &rate
		res.LatestGatePass = &gate
		if len(recentRuns) > 1 {
			delta := math.Round((recentRuns[0].PassRate-recentRuns[1].PassRate)*1000) / 10 // 百分点差值
			res.PassRateDelta = &delta
		}
	}
	return res
}

func clampRate(val, fallback float64) float64 {
	if val <= 0 || val > 1 {
		if fallback > 0 && fallback <= 1 {
			return fallback
		}
		return 0.8
	}
	return val
}

func toEvalCaseRes(row entity.AgentEvalCase) dto.EvalCaseRes {
	return dto.EvalCaseRes{
		ID:                 row.ID,
		DatasetID:          row.DatasetID,
		Name:               row.Name,
		Input:              row.Input,
		ExpectedPattern:    row.ExpectedPattern,
		ExpectedJSONSchema: row.ExpectedJSONSchema,
		JudgeCriteria:      row.JudgeCriteria,
		Tags:               row.Tags,
		Sort:               row.Sort,
		CreatedAt:          row.CreatedAt,
	}
}

func toEvalRunRes(row entity.AgentEvalRun) dto.EvalRunRes {
	return dto.EvalRunRes{
		ID:           row.ID,
		DatasetID:    row.DatasetID,
		AgentID:      row.AgentID,
		AgentName:    row.AgentName,
		Status:       row.Status,
		TotalCases:   row.TotalCases,
		PassedCases:  row.PassedCases,
		FailedCases:  row.FailedCases,
		PassRate:     row.PassRate,
		GatePassed:   row.GatePassed,
		AvgLatencyMs: row.AvgLatencyMs,
		TotalTokens:  row.TotalTokens,
		CompletedAt:  row.CompletedAt,
		CreatedAt:    row.CreatedAt,
	}
}

func toEvalCaseResultRes(row entity.AgentEvalCaseResult) dto.EvalCaseResultRes {
	return dto.EvalCaseResultRes{
		ID:              row.ID,
		EvalRunID:       row.EvalRunID,
		CaseID:          row.CaseID,
		CaseName:        row.CaseName,
		RunID:           row.RunID,
		Passed:          row.Passed,
		Score:           row.Score,
		ActualOutput:    row.ActualOutput,
		AssertionDetail: row.AssertionDetail,
		JudgeReason:     row.JudgeReason,
		LatencyMs:       row.LatencyMs,
		Tokens:          row.Tokens,
	}
}
