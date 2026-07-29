package service

import (
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"

	"gorm.io/gorm"
)

type NoticeService struct {
	*crud.BaseService[entity.SysNotice]
}

func NewNoticeService(db *gorm.DB) *NoticeService {
	return &NoticeService{
		BaseService: crud.NewBaseService[entity.SysNotice](db),
	}
}

// GetUnreadList 获取当前用户的未读通知列表
func (s *NoticeService) GetUnreadList(username string) ([]entity.SysNotice, error) {
	var notices []entity.SysNotice
	err := s.DB.Where("receiver = ? AND status = 0", username).Order("created_at desc").Find(&notices).Error
	return notices, err
}

// MarkAsRead 标记通知为已读
func (s *NoticeService) MarkAsRead(id uint, username string) error {
	return s.DB.Model(&entity.SysNotice{}).Where("id = ? AND receiver = ?", id, username).Update("status", 1).Error
}
