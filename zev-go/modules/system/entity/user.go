package entity

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model `swagger_tag:"系统管理-用户" swagger_path:"/api/system/user"`
	Username string `gorm:"uniqueIndex;type:varchar(50);not null" json:"username"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`
	Nickname string `gorm:"type:varchar(50)" json:"nickname"`
	Email    string `gorm:"type:varchar(100)" json:"email"`
	Avatar   string `gorm:"type:varchar(255)" json:"avatar"`
	RoleID   uint   `json:"role_id"`
	Status   int    `gorm:"default:0;comment:0-正常 1-禁用" json:"status"` // 0-正常 1-禁用
}
