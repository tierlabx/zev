package entity

import (
	"gorm.io/gorm"
)

type SysNotice struct {
	gorm.Model
	Title    string `gorm:"type:varchar(100);not null;comment:'通知标题'" json:"title"`
	Content  string `gorm:"type:text;not null;comment:'通知内容'" json:"content"`
	Type     int    `gorm:"type:int;not null;comment:'通知类型(1系统 2提醒)'" json:"type"`
	Sender   string `gorm:"type:varchar(50);comment:'发送人'" json:"sender"`
	Receiver string `gorm:"type:varchar(50);comment:'接收人'" json:"receiver"`
	Status   int    `gorm:"type:int;default:0;comment:'状态(0未读 1已读)'" json:"status"`
}
