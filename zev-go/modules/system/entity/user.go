package entity

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model `swagger_tag:"系统管理-用户" swagger_path:"/api/system/user"`
	Username   string `gorm:"uniqueIndex;type:varchar(50);not null" json:"username"`
	Password   string `gorm:"type:varchar(255);not null" json:"-"`
	Nickname   string `gorm:"type:varchar(50)" json:"nickname"`
	Email      string `gorm:"type:varchar(100)" json:"email"`
	Avatar     string `gorm:"type:varchar(255)" json:"avatar"`
	DeptID     uint   `gorm:"default:0;index" json:"dept_id"`
	RoleID     uint   `json:"role_id"`
	Roles      []Role `gorm:"many2many:sys_user_roles;" json:"roles,omitempty"`
	RoleIDs    []uint `gorm:"-" json:"role_ids"`
	DeptName   string `gorm:"-" json:"dept_name,omitempty"`
	CreatedBy  uint   `gorm:"default:0;index" json:"created_by"`
	Status     int    `gorm:"default:0;comment:0-正常 1-禁用" json:"status"` // 0-正常 1-禁用
}
