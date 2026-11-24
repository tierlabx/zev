package entity

import (
	"time"

	"gorm.io/gorm"
)

// SysNotice 系统消息与通知公告主表（兼容既有表名与列，支持草稿/发布/撤回及多范围定向推送）
type SysNotice struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Title       string         `gorm:"type:varchar(120);not null;comment:'通知标题'" json:"title"`
	Content     string         `gorm:"type:text;not null;comment:'通知内容'" json:"content"`
	Type        int            `gorm:"type:int;not null;default:1;index;comment:'通知类型(1系统公告 2业务提醒 3站内私信)'" json:"type"`
	Level       int            `gorm:"type:int;not null;default:0;comment:'优先级(0普通 1重要 2紧急)'" json:"level"`
	TargetType  int            `gorm:"type:int;not null;default:1;comment:'发送范围(1全员 2指定部门 3指定角色 4指定用户)'" json:"targetType"`
	TargetIDs   string         `gorm:"type:text;comment:'目标ID列表JSON'" json:"targetIds"`
	Link        string         `gorm:"type:varchar(255);comment:'可选站内跳转路径'" json:"link"`
	Status      int            `gorm:"type:int;not null;default:1;index;comment:'消息状态(0草稿 1已发布 2已撤回)'" json:"status"`
	SenderID    uint           `gorm:"default:0;index;comment:'发送人用户ID'" json:"senderId"`
	DeptID      uint           `gorm:"default:0;index;comment:'发送人所属部门ID'" json:"deptId"`
	Sender      string         `gorm:"type:varchar(50);comment:'发送人名称'" json:"sender"`
	Receiver    string         `gorm:"type:varchar(50);comment:'历史兼容接收人字段'" json:"receiver"`
	PublishedAt *time.Time     `gorm:"index;comment:'发布时间'" json:"publishedAt"`
	CreatedAt   time.Time      `gorm:"index" json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// SysNoticeRecipient 用户消息收件箱投递明细表（独立管理每人阅读状态与删除状态，避免全员广播写多份冗余正文）
type SysNoticeRecipient struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	NoticeID  uint           `gorm:"not null;uniqueIndex:idx_notice_user;comment:'消息ID'" json:"noticeId"`
	UserID    uint           `gorm:"not null;uniqueIndex:idx_notice_user;index:idx_user_read;comment:'接收人用户ID'" json:"userId"`
	IsRead    bool           `gorm:"not null;default:false;index:idx_user_read;comment:'是否已读'" json:"isRead"`
	ReadAt    *time.Time     `gorm:"comment:'阅读时间'" json:"readAt"`
	CreatedAt time.Time      `gorm:"index" json:"createdAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
