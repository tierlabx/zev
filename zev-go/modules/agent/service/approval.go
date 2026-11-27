package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"zev-go/modules/agent/dto"
	agentrt "zev-go/modules/agent/engine/runtime"
	"zev-go/modules/agent/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"
	"zev-go/pkg/noticehub"
	"zev-go/pkg/perm"

	"gorm.io/gorm"
)

const defaultApprovalTTL = 10 * time.Minute

// ApprovalService 负责高危工具审批单的持久化、pkg/noticehub 实时提醒推送与挂起协程唤醒
type ApprovalService struct {
	*crud.BaseService[entity.AgentApproval]
	broker *agentrt.ApprovalBroker
}

func NewApprovalService(db *gorm.DB, broker *agentrt.ApprovalBroker) *ApprovalService {
	return &ApprovalService{
		BaseService: crud.NewBaseService[entity.AgentApproval](db),
		broker:      broker,
	}
}

func (s *ApprovalService) Broker() *agentrt.ApprovalBroker {
	return s.broker
}

// CreateAndNotify 创建待审批单，并通过 pkg/noticehub 向拥有审批权限的在线管理员发送实时 SSE 提醒
func (s *ApprovalService) CreateAndNotify(
	runID, agentID uint,
	agentName, toolName, toolArgsJSON, riskLevel, reason string,
	requesterName string,
	scope *datascope.Scope,
) (*dto.ApprovalRes, error) {
	now := time.Now()
	row := entity.AgentApproval{
		RunID:         runID,
		AgentID:       agentID,
		AgentName:     agentName,
		ToolName:      toolName,
		ToolArgsJSON:  toolArgsJSON,
		RiskLevel:     riskLevel,
		Reason:        reason,
		Status:        "pending",
		RequesterName: requesterName,
		ExpiresAt:     now.Add(defaultApprovalTTL),
	}
	if scope != nil {
		row.RequesterID = scope.UserID
		row.CreatedBy = scope.UserID
		row.DeptID = scope.DeptID
	}
	if err := s.DB.Create(&row).Error; err != nil {
		return nil, err
	}

	// 必须在发送通知与推送 SSE 之前预注册等待通道，防止极速审批导致唤醒丢失
	if s.broker != nil {
		s.broker.Register(row.ID)
	}

	approverIDs := s.findApproverUserIDs()
	if len(approverIDs) > 0 {
		noticehub.Publish(approverIDs, noticehub.PushEvent{
			NoticeID:    0,
			Title:       fmt.Sprintf("智能体高危工具待审批：%s", toolName),
			Summary:     fmt.Sprintf("[%s] 触发高危操作审批（%s），请前往控制台处理。", agentName, reason),
			Type:        2,
			Level:       2,
			Sender:      "Agent 护栏",
			Link:        fmt.Sprintf("/agent/playground?approvalId=%d", row.ID),
			PublishedAt: now,
		})
	}

	res := toApprovalRes(row)
	return &res, nil
}

func (s *ApprovalService) List(req dto.ApprovalListReq, scope *datascope.Scope) ([]dto.ApprovalRes, int64, error) {
	s.expireStaleApprovals()
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	q := s.DB.Model(&entity.AgentApproval{}).Scopes(datascope.Apply(scope, datascope.Options{}))
	if st := strings.TrimSpace(req.Status); st != "" {
		q = q.Where("status = ?", st)
	}
	if req.RunID > 0 {
		q = q.Where("run_id = ?", req.RunID)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []entity.AgentApproval
	if err := q.Order("CASE WHEN status = 'pending' THEN 0 ELSE 1 END, id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	list := make([]dto.ApprovalRes, 0, len(rows))
	for _, r := range rows {
		list = append(list, toApprovalRes(r))
	}
	return list, total, nil
}

func (s *ApprovalService) PendingCount(scope *datascope.Scope) (int64, error) {
	s.expireStaleApprovals()
	var count int64
	err := s.DB.Model(&entity.AgentApproval{}).
		Scopes(datascope.Apply(scope, datascope.Options{})).
		Where("status = ?", "pending").
		Count(&count).Error
	return count, err
}

// Decide 执行审批裁决并立即通过 ApprovalBroker 唤醒或终止挂起中的 Agent Run
func (s *ApprovalService) Decide(id uint, req dto.ApprovalDecideReq, approverID uint, approverName string, scope *datascope.Scope) (*dto.ApprovalRes, error) {
	var row entity.AgentApproval
	if err := s.DB.Scopes(datascope.Apply(scope, datascope.Options{})).First(&row, id).Error; err != nil {
		return nil, errors.New("审批单不存在或无权访问")
	}
	if row.Status != "pending" {
		return nil, fmt.Errorf("当前审批单状态为 %s，无法重复审批", row.Status)
	}
	now := time.Now()
	if now.After(row.ExpiresAt) {
		_ = s.DB.Model(&row).Update("status", "expired").Error
		return nil, errors.New("审批单已过期")
	}

	if req.Approved {
		row.Status = "approved"
	} else {
		row.Status = "rejected"
	}
	row.ApproverID = approverID
	row.ApproverName = approverName
	row.DecisionComment = strings.TrimSpace(req.Comment)
	row.DecidedAt = &now

	txRes := s.DB.Model(&entity.AgentApproval{}).
		Where("id = ? AND status = ?", row.ID, "pending").
		Updates(map[string]any{
			"status":           row.Status,
			"approver_id":      row.ApproverID,
			"approver_name":    row.ApproverName,
			"decision_comment": row.DecisionComment,
			"decided_at":       row.DecidedAt,
		})
	if txRes.Error != nil {
		return nil, txRes.Error
	}
	if txRes.RowsAffected == 0 {
		return nil, errors.New("该审批单已被其他人处理或已过期")
	}

	if s.broker != nil {
		s.broker.Resolve(agentrt.ApprovalDecision{
			ApprovalID: row.ID,
			Approved:   req.Approved,
			Approver:   approverName,
			Comment:    row.DecisionComment,
		})
	}

	res := toApprovalRes(row)
	return &res, nil
}

// UpdatePendingStatus 仅在审批单仍处于 pending 时更新终态（用于超时过期或 Run 取消联动）
func (s *ApprovalService) UpdatePendingStatus(id uint, status string) {
	if id == 0 || status == "" {
		return
	}
	_ = s.DB.Model(&entity.AgentApproval{}).
		Where("id = ? AND status = ?", id, "pending").
		Update("status", status).Error
}

// CancelPendingByRunID 将指定 Run 下所有挂起中的审批单标记为已取消
func (s *ApprovalService) CancelPendingByRunID(runID uint) {
	if runID == 0 {
		return
	}
	_ = s.DB.Model(&entity.AgentApproval{}).
		Where("run_id = ? AND status = ?", runID, "pending").
		Update("status", "cancelled").Error
}

func (s *ApprovalService) expireStaleApprovals() {
	_ = s.DB.Model(&entity.AgentApproval{}).
		Where("status = ? AND expires_at < ?", "pending", time.Now()).
		Update("status", "expired").Error
}

// findApproverUserIDs 查找所有超级管理员及拥有 agent:approval:decide 权限的启用用户
func (s *ApprovalService) findApproverUserIDs() []uint {
	type approverRow struct {
		UserID   uint   `gorm:"column:user_id"`
		RoleID   uint   `gorm:"column:role_id"`
		RoleCode string `gorm:"column:role_code"`
		Perms    string `gorm:"column:perms"`
	}
	var rows []approverRow
	_ = s.DB.Table("users").
		Select("users.id AS user_id, roles.id AS role_id, roles.code AS role_code, COALESCE(menus.perms, '') AS perms").
		Joins("LEFT JOIN sys_user_roles ON sys_user_roles.user_id = users.id").
		Joins("LEFT JOIN roles ON (roles.id = sys_user_roles.role_id OR roles.id = users.role_id) AND roles.deleted_at IS NULL AND roles.status = 0").
		Joins("LEFT JOIN sys_role_menus ON sys_role_menus.role_id = roles.id").
		Joins("LEFT JOIN menus ON menus.id = sys_role_menus.menu_id AND menus.deleted_at IS NULL").
		Where("users.deleted_at IS NULL AND users.status = 0").
		Scan(&rows).Error

	seen := make(map[uint]struct{}, len(rows))
	ids := make([]uint, 0, len(rows))
	for _, row := range rows {
		if row.UserID == 0 {
			continue
		}
		if _, exists := seen[row.UserID]; exists {
			continue
		}
		if datascope.IsSuperAdminRole(row.RoleID, row.RoleCode) || perm.HasAny([]string{row.Perms}, []string{"agent:approval:decide"}) {
			seen[row.UserID] = struct{}{}
			ids = append(ids, row.UserID)
		}
	}
	return ids
}

func toApprovalRes(row entity.AgentApproval) dto.ApprovalRes {
	return dto.ApprovalRes{
		ID:              row.ID,
		RunID:           row.RunID,
		AgentID:         row.AgentID,
		AgentName:       row.AgentName,
		ToolName:        row.ToolName,
		ToolArgsJSON:    row.ToolArgsJSON,
		RiskLevel:       row.RiskLevel,
		Reason:          row.Reason,
		Status:          row.Status,
		RequesterID:     row.RequesterID,
		RequesterName:   row.RequesterName,
		ApproverID:      row.ApproverID,
		ApproverName:    row.ApproverName,
		DecisionComment: row.DecisionComment,
		DecidedAt:       row.DecidedAt,
		ExpiresAt:       row.ExpiresAt,
		CreatedAt:       row.CreatedAt,
	}
}
