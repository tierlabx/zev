package entity

import "time"

// SysLoginLog 登录审计日志实体（记录登录成功及各类失败原因）
type SysLoginLog struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	UserID    uint      `gorm:"default:0;index;comment:'用户ID(用户不存在时为0)'" json:"user_id"`
	DeptID    uint      `gorm:"default:0;index;comment:'所属部门ID'" json:"dept_id"`
	Username  string    `gorm:"type:varchar(50);index;not null;comment:'登录账号'" json:"username"`
	Status    int       `gorm:"type:int;index;comment:'登录状态(0失败 1成功)'" json:"status"`
	Message   string    `gorm:"type:varchar(255);comment:'提示或失败原因'" json:"message"`
	IP        string    `gorm:"type:varchar(50);comment:'登录IP'" json:"ip"`
	UserAgent string    `gorm:"type:varchar(500);comment:'原始User-Agent'" json:"userAgent"`
	Browser   string    `gorm:"type:varchar(64);comment:'浏览器'" json:"browser"`
	OS        string    `gorm:"type:varchar(64);comment:'操作系统'" json:"os"`
	RequestID string    `gorm:"type:varchar(64);index;comment:'链路追踪RequestID'" json:"requestId"`
	LoginTime time.Time `gorm:"index;comment:'登录时间'" json:"loginTime"`
}
