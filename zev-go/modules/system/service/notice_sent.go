package service

import (
	"errors"
	"strings"
	"time"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"

	"gorm.io/gorm"
)

const (
	sentRecipientPreviewLimit = 5
	sentRecipientDetailLimit  = 200
)

type sentRecipientRow struct {
	NoticeID uint
	UserID   uint
	Username string
	Nickname string
	IsRead   bool
	ReadAt   *time.Time
}

// ListSentNotices 分页查询当前用户已发出的消息（含私信与已发布公告），附带接收人预览与已读统计
func (s *NoticeService) ListSentNotices(senderID uint, req dto.SentNoticeListReq) (*dto.NoticePageRes[dto.SentNoticeItem], error) {
	page, pageSize := normalizeNoticePagination(req.Page, req.PageSize)

	query := s.DB.Model(&entity.SysNotice{}).
		Where("sender_id = ? AND status IN ?", senderID, []int{dto.NoticeStatusPublished, dto.NoticeStatusRevoked})

	if req.Type > 0 {
		query = query.Where("type = ?", req.Type)
	}
	if req.Level != nil {
		query = query.Where("level = ?", *req.Level)
	}
	if kw := strings.TrimSpace(req.Keyword); kw != "" {
		like := "%" + kw + "%"
		query = query.Where(
			`(title LIKE ? OR content LIKE ? OR EXISTS (
				SELECT 1 FROM sys_notice_recipients r
				JOIN users u ON u.id = r.user_id
				WHERE r.notice_id = sys_notices.id AND (u.username LIKE ? OR u.nickname LIKE ?)
			))`,
			like, like, like, like,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var notices []entity.SysNotice
	if err := query.Order("COALESCE(published_at, created_at) DESC, id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&notices).Error; err != nil {
		return nil, err
	}

	ids := make([]uint, 0, len(notices))
	for _, n := range notices {
		ids = append(ids, n.ID)
	}

	recipientRows, err := s.querySentRecipientRows(ids)
	if err != nil {
		return nil, err
	}
	statsMap, previewMap := buildSentRecipientSummary(recipientRows, sentRecipientPreviewLimit)

	items := make([]dto.SentNoticeItem, 0, len(notices))
	for _, n := range notices {
		st := statsMap[n.ID]
		recipients := previewMap[n.ID]
		if recipients == nil {
			recipients = []dto.SentNoticeRecipientItem{}
		}
		items = append(items, toSentNoticeItem(n, st.ReadCount, st.TotalCount, recipients))
	}

	return &dto.NoticePageRes[dto.SentNoticeItem]{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetSentNoticeDetail 获取当前用户已发送单条消息详情及完整接收人阅读状态
func (s *NoticeService) GetSentNoticeDetail(senderID, noticeID uint) (*dto.SentNoticeItem, error) {
	var notice entity.SysNotice
	err := s.DB.Model(&entity.SysNotice{}).
		Where("id = ? AND sender_id = ? AND status IN ?", noticeID, senderID, []int{dto.NoticeStatusPublished, dto.NoticeStatusRevoked}).
		First(&notice).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("消息不存在或无权查看")
		}
		return nil, err
	}

	recipientRows, err := s.querySentRecipientRows([]uint{notice.ID})
	if err != nil {
		return nil, err
	}
	statsMap, detailMap := buildSentRecipientSummary(recipientRows, sentRecipientDetailLimit)
	st := statsMap[notice.ID]
	recipients := detailMap[notice.ID]
	if recipients == nil {
		recipients = []dto.SentNoticeRecipientItem{}
	}

	item := toSentNoticeItem(notice, st.ReadCount, st.TotalCount, recipients)
	return &item, nil
}

// RevokeMyDirectMessage 允许发件人撤回自己发出的已发布站内私信
func (s *NoticeService) RevokeMyDirectMessage(senderID, noticeID uint) error {
	var notice entity.SysNotice
	if err := s.DB.First(&notice, noticeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("消息不存在")
		}
		return err
	}
	if notice.SenderID != senderID {
		return errors.New("无权限撤回该消息")
	}
	if notice.Type != dto.NoticeTypePrivate {
		return errors.New("仅支持撤回站内私信")
	}
	if notice.Status != dto.NoticeStatusPublished {
		return errors.New("仅已发布状态的私信支持撤回")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.SysNotice{}).
			Where("id = ?", noticeID).
			Update("status", dto.NoticeStatusRevoked).Error; err != nil {
			return err
		}
		return tx.Where("notice_id = ?", noticeID).Delete(&entity.SysNoticeRecipient{}).Error
	})
}

// querySentRecipientRows 不过滤 sys_notice_recipients.deleted_at，确保接收人删除已读消息后发件人仍保留完整回执
func (s *NoticeService) querySentRecipientRows(noticeIDs []uint) ([]sentRecipientRow, error) {
	if len(noticeIDs) == 0 {
		return nil, nil
	}
	var rows []sentRecipientRow
	err := s.DB.Table("sys_notice_recipients AS r").
		Select("r.notice_id, r.user_id, COALESCE(u.username, '') AS username, COALESCE(u.nickname, '') AS nickname, r.is_read, r.read_at").
		Joins("LEFT JOIN users AS u ON u.id = r.user_id").
		Where("r.notice_id IN ?", noticeIDs).
		Order("r.notice_id ASC, r.is_read DESC, r.read_at DESC, r.user_id ASC").
		Scan(&rows).Error
	return rows, err
}

func buildSentRecipientSummary(rows []sentRecipientRow, maxRecipients int) (map[uint]noticeReadStats, map[uint][]dto.SentNoticeRecipientItem) {
	stats := make(map[uint]noticeReadStats)
	recipients := make(map[uint][]dto.SentNoticeRecipientItem)

	for _, r := range rows {
		st := stats[r.NoticeID]
		st.TotalCount++
		if r.IsRead {
			st.ReadCount++
		}
		stats[r.NoticeID] = st

		if maxRecipients <= 0 || len(recipients[r.NoticeID]) < maxRecipients {
			recipients[r.NoticeID] = append(recipients[r.NoticeID], dto.SentNoticeRecipientItem{
				UserID:   r.UserID,
				Username: r.Username,
				Nickname: r.Nickname,
				IsRead:   r.IsRead,
				ReadAt:   r.ReadAt,
			})
		}
	}

	return stats, recipients
}

func toSentNoticeItem(n entity.SysNotice, readCount, totalCount int64, recipients []dto.SentNoticeRecipientItem) dto.SentNoticeItem {
	return dto.SentNoticeItem{
		ID:          n.ID,
		Title:       n.Title,
		Content:     n.Content,
		Type:        n.Type,
		Level:       n.Level,
		TargetType:  n.TargetType,
		Link:        n.Link,
		Status:      n.Status,
		SenderID:    n.SenderID,
		Sender:      n.Sender,
		ReadCount:   readCount,
		TotalCount:  totalCount,
		Recipients:  recipients,
		PublishedAt: n.PublishedAt,
		CreatedAt:   n.CreatedAt,
	}
}
