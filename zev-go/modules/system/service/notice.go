package service

import (
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"
	"zev-go/pkg/noticehub"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	defaultNoticePageSize = 20
	maxNoticePageSize     = 100
	defaultUnreadLimit    = 6
	maxUnreadLimit        = 50
)

// NoticeService 系统消息中心与通知管理服务
type NoticeService struct {
	*crud.BaseService[entity.SysNotice]
}

func NewNoticeService(db *gorm.DB) *NoticeService {
	return &NoticeService{
		BaseService: crud.NewBaseService[entity.SysNotice](db),
	}
}

func isGlobalNoticeScope(scope *datascope.Scope) bool {
	return scope != nil && (scope.IsSuperAdmin || scope.AllData)
}

func normalizeNoticePagination(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = defaultNoticePageSize
	} else if pageSize > maxNoticePageSize {
		pageSize = maxNoticePageSize
	}
	return page, pageSize
}

func deduplicateNoticeIDs(ids []uint) []uint {
	seen := make(map[uint]struct{}, len(ids))
	res := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		res = append(res, id)
	}
	return res
}

func encodeTargetIDs(ids []uint) string {
	cleaned := deduplicateNoticeIDs(ids)
	if len(cleaned) == 0 {
		return "[]"
	}
	raw, err := json.Marshal(cleaned)
	if err != nil {
		return "[]"
	}
	return string(raw)
}

func decodeTargetIDs(raw string) []uint {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []uint{}
	}
	var ids []uint
	if err := json.Unmarshal([]byte(trimmed), &ids); err != nil {
		return []uint{}
	}
	return deduplicateNoticeIDs(ids)
}

// normalizeInternalLink 仅允许站内相对路径跳转，防止恶意外部重定向或脚本伪协议注入
func normalizeInternalLink(link string) (string, error) {
	trimmed := strings.TrimSpace(link)
	if trimmed == "" {
		return "", nil
	}
	if !strings.HasPrefix(trimmed, "/") || strings.HasPrefix(trimmed, "//") {
		return "", errors.New("站内跳转链接必须以单个 / 开头")
	}
	return trimmed, nil
}

// SummarizeContent 折叠空白字符并按 rune 安全截取通知摘要，供实时推送弹窗展示
func SummarizeContent(content string, maxRunes int) string {
	collapsed := strings.Join(strings.Fields(content), " ")
	if maxRunes <= 0 || utf8.RuneCountInString(collapsed) <= maxRunes {
		return collapsed
	}
	runes := []rune(collapsed)
	return string(runes[:maxRunes]) + "..."
}

func (s *NoticeService) baseMyNoticeQuery(userID uint) *gorm.DB {
	return s.DB.Table("sys_notice_recipients").
		Joins("JOIN sys_notices ON sys_notices.id = sys_notice_recipients.notice_id AND sys_notices.deleted_at IS NULL").
		Where("sys_notice_recipients.deleted_at IS NULL AND sys_notice_recipients.user_id = ? AND sys_notices.status = ?", userID, dto.NoticeStatusPublished)
}

// GetUnreadCount 获取当前登录用户各分类未读消息数量
func (s *NoticeService) GetUnreadCount(userID uint) (*dto.UnreadCountRes, error) {
	type typeRow struct {
		Type  int
		Count int64
	}
	var rows []typeRow
	err := s.baseMyNoticeQuery(userID).
		Select("sys_notices.type AS type, COUNT(*) AS count").
		Where("sys_notice_recipients.is_read = ?", false).
		Group("sys_notices.type").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	res := &dto.UnreadCountRes{}
	for _, r := range rows {
		res.Total += r.Count
		switch r.Type {
		case dto.NoticeTypeSystem:
			res.System += r.Count
		case dto.NoticeTypeReminder:
			res.Reminder += r.Count
		case dto.NoticeTypePrivate:
			res.Private += r.Count
		}
	}
	return res, nil
}

// GetUnreadList 获取当前用户最近未读消息列表（用于顶栏通知铃铛弹窗）
func (s *NoticeService) GetUnreadList(userID uint, limit int) ([]dto.MyNoticeItem, error) {
	if limit <= 0 {
		limit = defaultUnreadLimit
	} else if limit > maxUnreadLimit {
		limit = maxUnreadLimit
	}

	items := make([]dto.MyNoticeItem, 0)
	err := s.baseMyNoticeQuery(userID).
		Select(`sys_notices.id, sys_notices.title, sys_notices.content, sys_notices.type, sys_notices.level,
			sys_notices.target_type, sys_notices.link, sys_notices.sender_id, sys_notices.sender,
			sys_notice_recipients.is_read, sys_notice_recipients.read_at, sys_notices.published_at, sys_notices.created_at`).
		Where("sys_notice_recipients.is_read = ?", false).
		Order("COALESCE(sys_notices.published_at, sys_notices.created_at) DESC, sys_notices.id DESC").
		Limit(limit).
		Scan(&items).Error
	return items, err
}

// ListMyNotices 分页查询个人收件箱消息
func (s *NoticeService) ListMyNotices(userID uint, req dto.MyNoticeListReq) (*dto.NoticePageRes[dto.MyNoticeItem], error) {
	page, pageSize := normalizeNoticePagination(req.Page, req.PageSize)

	query := s.baseMyNoticeQuery(userID)
	if req.Type > 0 {
		query = query.Where("sys_notices.type = ?", req.Type)
	}
	if req.IsRead != nil {
		query = query.Where("sys_notice_recipients.is_read = ?", *req.IsRead)
	}
	if req.Level != nil {
		query = query.Where("sys_notices.level = ?", *req.Level)
	}
	if kw := strings.TrimSpace(req.Keyword); kw != "" {
		like := "%" + kw + "%"
		query = query.Where("(sys_notices.title LIKE ? OR sys_notices.content LIKE ? OR sys_notices.sender LIKE ?)", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	list := make([]dto.MyNoticeItem, 0)
	err := query.
		Select(`sys_notices.id, sys_notices.title, sys_notices.content, sys_notices.type, sys_notices.level,
			sys_notices.target_type, sys_notices.link, sys_notices.sender_id, sys_notices.sender,
			sys_notice_recipients.is_read, sys_notice_recipients.read_at, sys_notices.published_at, sys_notices.created_at`).
		Order("COALESCE(sys_notices.published_at, sys_notices.created_at) DESC, sys_notices.id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Scan(&list).Error
	if err != nil {
		return nil, err
	}

	return &dto.NoticePageRes[dto.MyNoticeItem]{
		List:     list,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetMyNoticeDetail 获取个人收件箱单条消息详情
func (s *NoticeService) GetMyNoticeDetail(userID, noticeID uint) (*dto.MyNoticeItem, error) {
	var item dto.MyNoticeItem
	err := s.baseMyNoticeQuery(userID).
		Select(`sys_notices.id, sys_notices.title, sys_notices.content, sys_notices.type, sys_notices.level,
			sys_notices.target_type, sys_notices.link, sys_notices.sender_id, sys_notices.sender,
			sys_notice_recipients.is_read, sys_notice_recipients.read_at, sys_notices.published_at, sys_notices.created_at`).
		Where("sys_notices.id = ?", noticeID).
		Take(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("消息不存在或已撤回")
		}
		return nil, err
	}
	return &item, nil
}

// MarkAsRead 标记个人单条消息为已读
func (s *NoticeService) MarkAsRead(userID, noticeID uint) error {
	now := time.Now()
	return s.DB.Model(&entity.SysNoticeRecipient{}).
		Where("notice_id = ? AND user_id = ? AND is_read = ?", noticeID, userID, false).
		Updates(map[string]any{"is_read": true, "read_at": &now}).Error
}

// MarkAsUnread 标记个人单条消息为未读
func (s *NoticeService) MarkAsUnread(userID, noticeID uint) error {
	return s.DB.Model(&entity.SysNoticeRecipient{}).
		Where("notice_id = ? AND user_id = ?", noticeID, userID).
		Updates(map[string]any{"is_read": false, "read_at": nil}).Error
}

// MarkAllAsRead 将当前用户未读消息全部标为已读（可按消息类型限定）
func (s *NoticeService) MarkAllAsRead(userID uint, noticeType int) error {
	now := time.Now()
	subQuery := s.DB.Model(&entity.SysNotice{}).
		Select("id").
		Where("status = ?", dto.NoticeStatusPublished)
	if noticeType > 0 {
		subQuery = subQuery.Where("type = ?", noticeType)
	}

	return s.DB.Model(&entity.SysNoticeRecipient{}).
		Where("user_id = ? AND is_read = ? AND notice_id IN (?)", userID, false, subQuery).
		Updates(map[string]any{"is_read": true, "read_at": &now}).Error
}

// DeleteMyNotices 从当前用户收件箱软删除指定消息
func (s *NoticeService) DeleteMyNotices(userID uint, noticeIDs []uint) error {
	ids := deduplicateNoticeIDs(noticeIDs)
	if len(ids) == 0 {
		return errors.New("请选择需要删除的消息")
	}
	return s.DB.Where("user_id = ? AND notice_id IN ?", userID, ids).
		Delete(&entity.SysNoticeRecipient{}).Error
}

// ClearReadNotices 清空当前用户收件箱中的全部已读消息
func (s *NoticeService) ClearReadNotices(userID uint) error {
	return s.DB.Where("user_id = ? AND is_read = ?", userID, true).
		Delete(&entity.SysNoticeRecipient{}).Error
}

// ListReceiverOptions 返回允许接收站内消息的启用用户精简列表
func (s *NoticeService) ListReceiverOptions(scope *datascope.Scope, keyword string) ([]dto.ReceiverOption, error) {
	if scope == nil {
		return []dto.ReceiverOption{}, nil
	}

	query := s.DB.Table("users").
		Select("users.id, users.username, users.nickname, COALESCE(depts.name, '') AS dept_name").
		Joins("LEFT JOIN depts ON depts.id = users.dept_id AND depts.deleted_at IS NULL").
		Where("users.deleted_at IS NULL AND users.status = ?", 0)

	if !isGlobalNoticeScope(scope) {
		switch {
		case len(scope.DeptIDs) > 0:
			query = query.Where("users.dept_id IN ?", scope.DeptIDs)
		case scope.DeptID > 0:
			// 仅本人数据范围的用户允许向同部门协作同事发送站内私信
			query = query.Where("users.dept_id = ?", scope.DeptID)
		default:
			query = query.Where("users.id = ?", scope.UserID)
		}
	}

	if kw := strings.TrimSpace(keyword); kw != "" {
		like := "%" + kw + "%"
		query = query.Where("(users.username LIKE ? OR users.nickname LIKE ?)", like, like)
	}

	options := make([]dto.ReceiverOption, 0)
	err := query.Order("users.id ASC").Limit(200).Scan(&options).Error
	return options, err
}

// SendDirectMessage 发送站内私信并实时推送给在线接收人
func (s *NoticeService) SendDirectMessage(scope *datascope.Scope, senderID uint, senderName string, req dto.SendDirectMessageReq) (*entity.SysNotice, error) {
	if scope == nil {
		return nil, errors.New("无有效权限上下文")
	}

	link, err := normalizeInternalLink(req.Link)
	if err != nil {
		return nil, err
	}

	receiverIDs := deduplicateNoticeIDs(req.ReceiverIDs)
	if len(receiverIDs) == 0 {
		return nil, errors.New("请至少选择一名接收人")
	}

	var users []struct {
		ID     uint
		DeptID uint
	}
	if err := s.DB.Table("users").
		Select("id, dept_id").
		Where("id IN ? AND status = ? AND deleted_at IS NULL", receiverIDs, 0).
		Scan(&users).Error; err != nil {
		return nil, err
	}
	if len(users) != len(receiverIDs) {
		return nil, errors.New("部分接收人不存在或已被禁用")
	}

	if !isGlobalNoticeScope(scope) {
		allowedDepts := make(map[uint]struct{}, len(scope.DeptIDs)+1)
		for _, did := range scope.DeptIDs {
			allowedDepts[did] = struct{}{}
		}
		if scope.DeptID > 0 {
			allowedDepts[scope.DeptID] = struct{}{}
		}
		for _, u := range users {
			if u.ID == senderID {
				continue
			}
			if _, ok := allowedDepts[u.DeptID]; !ok {
				return nil, errors.New("无权限向可见范围外的用户发送私信")
			}
		}
	}

	now := time.Now()
	notice := &entity.SysNotice{
		Title:       strings.TrimSpace(req.Title),
		Content:     strings.TrimSpace(req.Content),
		Type:        dto.NoticeTypePrivate,
		Level:       req.Level,
		TargetType:  dto.NoticeTargetUser,
		TargetIDs:   encodeTargetIDs(receiverIDs),
		Link:        link,
		Status:      dto.NoticeStatusPublished,
		SenderID:    senderID,
		DeptID:      scope.DeptID,
		Sender:      senderName,
		PublishedAt: &now,
	}

	err = s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(notice).Error; err != nil {
			return err
		}
		return s.upsertRecipientsTx(tx, notice.ID, receiverIDs)
	})
	if err != nil {
		return nil, err
	}

	s.pushRealtime(notice, receiverIDs)
	return notice, nil
}

// ListManageNotices 管理端分页查询通知公告，叠加数据权限范围与批量已读回执聚合
func (s *NoticeService) ListManageNotices(scope *datascope.Scope, req dto.ManageNoticeListReq) (*dto.NoticePageRes[dto.ManageNoticeItem], error) {
	page, pageSize := normalizeNoticePagination(req.Page, req.PageSize)

	query := s.DB.Model(&entity.SysNotice{}).
		Scopes(datascope.Apply(scope, datascope.Options{DeptColumn: "dept_id", UserColumn: "sender_id"}))

	if kw := strings.TrimSpace(req.Keyword); kw != "" {
		like := "%" + kw + "%"
		query = query.Where("(title LIKE ? OR content LIKE ? OR sender LIKE ?)", like, like, like)
	}
	if req.Type > 0 {
		query = query.Where("type = ?", req.Type)
	}
	if req.Level != nil {
		query = query.Where("level = ?", *req.Level)
	}
	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}
	if req.TargetType > 0 {
		query = query.Where("target_type = ?", req.TargetType)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var notices []entity.SysNotice
	if err := query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&notices).Error; err != nil {
		return nil, err
	}

	statsMap, err := s.aggregateReadStats(notices)
	if err != nil {
		return nil, err
	}

	items := make([]dto.ManageNoticeItem, 0, len(notices))
	for _, n := range notices {
		st := statsMap[n.ID]
		items = append(items, toManageNoticeItem(n, st.ReadCount, st.TotalCount))
	}

	return &dto.NoticePageRes[dto.ManageNoticeItem]{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetManageNotice 获取单条管理端消息详情（含越权校验与已读统计）
func (s *NoticeService) GetManageNotice(scope *datascope.Scope, id uint) (*dto.ManageNoticeItem, error) {
	var notice entity.SysNotice
	if err := s.DB.First(&notice, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("消息不存在")
		}
		return nil, err
	}
	if !datascope.CanAccessRecord(scope, notice.DeptID, notice.SenderID) {
		return nil, errors.New("无权限查看该消息")
	}
	statsMap, err := s.aggregateReadStats([]entity.SysNotice{notice})
	if err != nil {
		return nil, err
	}
	st := statsMap[notice.ID]
	item := toManageNoticeItem(notice, st.ReadCount, st.TotalCount)
	return &item, nil
}

// CreateNotice 创建系统公告/业务提醒/定向消息，支持存草稿或立即发布并推送
func (s *NoticeService) CreateNotice(scope *datascope.Scope, senderID uint, senderName string, req dto.CreateNoticeReq) (*dto.ManageNoticeItem, error) {
	if scope == nil {
		return nil, errors.New("无有效权限上下文")
	}

	link, err := normalizeInternalLink(req.Link)
	if err != nil {
		return nil, err
	}

	cleanedTargets, err := s.validateTargetPermissions(scope, req.TargetType, req.TargetIDs)
	if err != nil {
		return nil, err
	}

	notice := &entity.SysNotice{
		Title:      strings.TrimSpace(req.Title),
		Content:    strings.TrimSpace(req.Content),
		Type:       req.Type,
		Level:      req.Level,
		TargetType: req.TargetType,
		TargetIDs:  encodeTargetIDs(cleanedTargets),
		Link:       link,
		Status:     dto.NoticeStatusDraft,
		SenderID:   senderID,
		DeptID:     scope.DeptID,
		Sender:     senderName,
	}

	var pushedIDs []uint
	err = s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(notice).Error; err != nil {
			return err
		}
		if req.PublishNow {
			ids, err := s.publishInTx(tx, notice)
			if err != nil {
				return err
			}
			pushedIDs = ids
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if req.PublishNow {
		s.pushRealtime(notice, pushedIDs)
	}

	item := toManageNoticeItem(*notice, 0, int64(len(pushedIDs)))
	return &item, nil
}

// UpdateNotice 编辑消息内容（已发布状态仅同步更新展示内容，不破坏既有投递回执）
func (s *NoticeService) UpdateNotice(scope *datascope.Scope, req dto.UpdateNoticeReq) error {
	var existing entity.SysNotice
	if err := s.DB.First(&existing, req.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("消息不存在")
		}
		return err
	}
	if !datascope.CanAccessRecord(scope, existing.DeptID, existing.SenderID) {
		return errors.New("无权限修改该消息")
	}

	link, err := normalizeInternalLink(req.Link)
	if err != nil {
		return err
	}

	updates := map[string]any{
		"title":   strings.TrimSpace(req.Title),
		"content": strings.TrimSpace(req.Content),
		"type":    req.Type,
		"level":   req.Level,
		"link":    link,
	}

	// 草稿和已撤回消息允许调整目标范围；已发布消息保留当前投递范围避免回执错乱
	if existing.Status != dto.NoticeStatusPublished {
		cleanedTargets, err := s.validateTargetPermissions(scope, req.TargetType, req.TargetIDs)
		if err != nil {
			return err
		}
		updates["target_type"] = req.TargetType
		updates["target_ids"] = encodeTargetIDs(cleanedTargets)
	}

	return s.DB.Model(&entity.SysNotice{}).Where("id = ?", existing.ID).Updates(updates).Error
}

// PublishNotice 发布草稿或重新发布已撤回消息，向目标用户投递并触发实时推送
func (s *NoticeService) PublishNotice(scope *datascope.Scope, id uint) error {
	var notice entity.SysNotice
	if err := s.DB.First(&notice, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("消息不存在")
		}
		return err
	}
	if !datascope.CanAccessRecord(scope, notice.DeptID, notice.SenderID) {
		return errors.New("无权限发布该消息")
	}
	if notice.Status == dto.NoticeStatusPublished {
		return errors.New("该消息已处于发布状态")
	}

	targetIDs := decodeTargetIDs(notice.TargetIDs)
	if _, err := s.validateTargetPermissions(scope, notice.TargetType, targetIDs); err != nil {
		return err
	}

	var pushedIDs []uint
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		ids, err := s.publishInTx(tx, &notice)
		if err != nil {
			return err
		}
		pushedIDs = ids
		return nil
	})
	if err != nil {
		return err
	}

	s.pushRealtime(&notice, pushedIDs)
	return nil
}

// RevokeNotice 撤回已发布消息并清理接收人收件箱记录
func (s *NoticeService) RevokeNotice(scope *datascope.Scope, id uint) error {
	var notice entity.SysNotice
	if err := s.DB.First(&notice, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("消息不存在")
		}
		return err
	}
	if !datascope.CanAccessRecord(scope, notice.DeptID, notice.SenderID) {
		return errors.New("无权限撤回该消息")
	}
	if notice.Status != dto.NoticeStatusPublished {
		return errors.New("仅已发布状态的消息支持撤回")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.SysNotice{}).Where("id = ?", id).Update("status", dto.NoticeStatusRevoked).Error; err != nil {
			return err
		}
		return tx.Where("notice_id = ?", id).Delete(&entity.SysNoticeRecipient{}).Error
	})
}

// DeleteNotices 批量软删除消息及关联收件箱投递明细（严格校验数据权限）
func (s *NoticeService) DeleteNotices(scope *datascope.Scope, ids []uint) error {
	uniqueIDs := deduplicateNoticeIDs(ids)
	if len(uniqueIDs) == 0 {
		return errors.New("请选择需要删除的消息")
	}

	var rows []entity.SysNotice
	if err := s.DB.Select("id, dept_id, sender_id").Where("id IN ?", uniqueIDs).Find(&rows).Error; err != nil {
		return err
	}
	if len(rows) == 0 {
		return errors.New("未找到可删除的消息")
	}
	for _, r := range rows {
		if !datascope.CanAccessRecord(scope, r.DeptID, r.SenderID) {
			return errors.New("包含无权删除的消息记录")
		}
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("notice_id IN ?", uniqueIDs).Delete(&entity.SysNoticeRecipient{}).Error; err != nil {
			return err
		}
		return tx.Where("id IN ?", uniqueIDs).Delete(&entity.SysNotice{}).Error
	})
}

func (s *NoticeService) validateTargetPermissions(scope *datascope.Scope, targetType int, rawTargetIDs []uint) ([]uint, error) {
	cleaned := deduplicateNoticeIDs(rawTargetIDs)
	global := isGlobalNoticeScope(scope)

	switch targetType {
	case dto.NoticeTargetAll:
		if !global {
			return nil, errors.New("仅超级管理员或全部数据权限角色可发送全员广播")
		}
		return []uint{}, nil

	case dto.NoticeTargetRole:
		if !global {
			return nil, errors.New("仅超级管理员或全部数据权限角色可按角色群发")
		}
		if len(cleaned) == 0 {
			return nil, errors.New("请至少选择一个目标角色")
		}
		return cleaned, nil

	case dto.NoticeTargetDept:
		if len(cleaned) == 0 {
			return nil, errors.New("请至少选择一个目标部门")
		}
		if !global {
			for _, did := range cleaned {
				if !slices.Contains(scope.DeptIDs, did) {
					return nil, errors.New("包含超出当前数据权限范围的目标部门")
				}
			}
		}
		return cleaned, nil

	case dto.NoticeTargetUser:
		if len(cleaned) == 0 {
			return nil, errors.New("请至少选择一个目标用户")
		}
		if !global {
			var users []struct {
				ID     uint
				DeptID uint
			}
			if err := s.DB.Table("users").
				Select("id, dept_id").
				Where("id IN ? AND deleted_at IS NULL", cleaned).
				Scan(&users).Error; err != nil {
				return nil, err
			}
			if len(users) != len(cleaned) {
				return nil, errors.New("部分目标用户不存在")
			}
			for _, u := range users {
				if !datascope.CanAccessRecord(scope, u.DeptID, u.ID) {
					return nil, errors.New("包含超出当前数据权限范围的目标用户")
				}
			}
		}
		return cleaned, nil

	default:
		return nil, errors.New("无效的目标发送范围")
	}
}

func (s *NoticeService) resolveTargetUserIDs(tx *gorm.DB, targetType int, targetIDs []uint) ([]uint, error) {
	var userIDs []uint

	switch targetType {
	case dto.NoticeTargetAll:
		if err := tx.Table("users").
			Where("status = ? AND deleted_at IS NULL", 0).
			Pluck("id", &userIDs).Error; err != nil {
			return nil, err
		}

	case dto.NoticeTargetDept:
		if len(targetIDs) == 0 {
			return []uint{}, nil
		}
		var allDepts []datascope.DeptNode
		if err := tx.Table("depts").
			Select("id, parent_id, ancestors").
			Where("status = ? AND deleted_at IS NULL", 0).
			Scan(&allDepts).Error; err != nil {
			return nil, err
		}
		deptSet := make(map[uint]struct{})
		for _, did := range targetIDs {
			for _, subID := range datascope.CollectDeptAndChildren(did, allDepts) {
				deptSet[subID] = struct{}{}
			}
		}
		expandedDeptIDs := make([]uint, 0, len(deptSet))
		for id := range deptSet {
			expandedDeptIDs = append(expandedDeptIDs, id)
		}
		if len(expandedDeptIDs) == 0 {
			return []uint{}, nil
		}
		if err := tx.Table("users").
			Where("status = ? AND deleted_at IS NULL AND dept_id IN ?", 0, expandedDeptIDs).
			Pluck("id", &userIDs).Error; err != nil {
			return nil, err
		}

	case dto.NoticeTargetRole:
		if len(targetIDs) == 0 {
			return []uint{}, nil
		}
		var activeRoleIDs []uint
		if err := tx.Table("roles").
			Where("id IN ? AND status = ? AND deleted_at IS NULL", targetIDs, 0).
			Pluck("id", &activeRoleIDs).Error; err != nil {
			return nil, err
		}
		if len(activeRoleIDs) == 0 {
			return []uint{}, nil
		}
		err := tx.Table("users").
			Where("status = ? AND deleted_at IS NULL AND (role_id IN ? OR id IN (SELECT user_id FROM sys_user_roles WHERE role_id IN ?))",
				0, activeRoleIDs, activeRoleIDs).
			Pluck("id", &userIDs).Error
		if err != nil {
			return nil, err
		}

	case dto.NoticeTargetUser:
		if len(targetIDs) == 0 {
			return []uint{}, nil
		}
		if err := tx.Table("users").
			Where("id IN ? AND status = ? AND deleted_at IS NULL", targetIDs, 0).
			Pluck("id", &userIDs).Error; err != nil {
			return nil, err
		}
	}

	return deduplicateNoticeIDs(userIDs), nil
}

func (s *NoticeService) publishInTx(tx *gorm.DB, notice *entity.SysNotice) ([]uint, error) {
	recipientIDs, err := s.resolveTargetUserIDs(tx, notice.TargetType, decodeTargetIDs(notice.TargetIDs))
	if err != nil {
		return nil, err
	}
	if len(recipientIDs) == 0 {
		return nil, errors.New("目标范围内没有可用的启用接收用户")
	}

	now := time.Now()
	notice.Status = dto.NoticeStatusPublished
	notice.PublishedAt = &now

	if err := tx.Model(&entity.SysNotice{}).
		Where("id = ?", notice.ID).
		Updates(map[string]any{
			"status":       dto.NoticeStatusPublished,
			"published_at": &now,
		}).Error; err != nil {
		return nil, err
	}

	if err := s.upsertRecipientsTx(tx, notice.ID, recipientIDs); err != nil {
		return nil, err
	}
	return recipientIDs, nil
}

func (s *NoticeService) upsertRecipientsTx(tx *gorm.DB, noticeID uint, recipientIDs []uint) error {
	rows := make([]entity.SysNoticeRecipient, 0, len(recipientIDs))
	for _, uid := range recipientIDs {
		rows = append(rows, entity.SysNoticeRecipient{
			NoticeID: noticeID,
			UserID:   uid,
			IsRead:   false,
		})
	}
	// 撤回后重新发布时恢复软删除状态并保留既有的已读时间与记录
	return tx.Unscoped().
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "notice_id"}, {Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"deleted_at": nil,
			}),
		}).
		CreateInBatches(&rows, 200).Error
}

func (s *NoticeService) pushRealtime(notice *entity.SysNotice, recipientIDs []uint) {
	if notice == nil || len(recipientIDs) == 0 {
		return
	}
	publishedAt := time.Now()
	if notice.PublishedAt != nil {
		publishedAt = *notice.PublishedAt
	}
	noticehub.Publish(recipientIDs, noticehub.PushEvent{
		NoticeID:    notice.ID,
		Title:       notice.Title,
		Summary:     SummarizeContent(notice.Content, 100),
		Type:        notice.Type,
		Level:       notice.Level,
		Sender:      notice.Sender,
		Link:        notice.Link,
		PublishedAt: publishedAt,
	})
}

type noticeReadStats struct {
	TotalCount int64
	ReadCount  int64
}

func (s *NoticeService) aggregateReadStats(notices []entity.SysNotice) (map[uint]noticeReadStats, error) {
	result := make(map[uint]noticeReadStats, len(notices))
	if len(notices) == 0 {
		return result, nil
	}

	ids := make([]uint, 0, len(notices))
	for _, n := range notices {
		ids = append(ids, n.ID)
	}

	type aggRow struct {
		NoticeID   uint
		TotalCount int64
		ReadCount  int64
	}
	var rows []aggRow
	err := s.DB.Table("sys_notice_recipients").
		Select("notice_id, COUNT(*) AS total_count, SUM(CASE WHEN is_read THEN 1 ELSE 0 END) AS read_count").
		Where("notice_id IN ? AND deleted_at IS NULL", ids).
		Group("notice_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for _, r := range rows {
		result[r.NoticeID] = noticeReadStats{
			TotalCount: r.TotalCount,
			ReadCount:  r.ReadCount,
		}
	}
	return result, nil
}

func toManageNoticeItem(n entity.SysNotice, readCount, totalCount int64) dto.ManageNoticeItem {
	return dto.ManageNoticeItem{
		ID:          n.ID,
		Title:       n.Title,
		Content:     n.Content,
		Type:        n.Type,
		Level:       n.Level,
		TargetType:  n.TargetType,
		TargetIDs:   decodeTargetIDs(n.TargetIDs),
		Link:        n.Link,
		Status:      n.Status,
		SenderID:    n.SenderID,
		DeptID:      n.DeptID,
		Sender:      n.Sender,
		ReadCount:   readCount,
		TotalCount:  totalCount,
		PublishedAt: n.PublishedAt,
		CreatedAt:   n.CreatedAt,
		UpdatedAt:   n.UpdatedAt,
	}
}
