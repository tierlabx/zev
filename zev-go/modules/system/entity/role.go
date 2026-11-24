package entity

import (
	"gorm.io/gorm"
)

type Role struct {
	gorm.Model `swagger_tag:"系统管理-角色" swagger_path:"/api/system/role"`
	Name       string `gorm:"type:varchar(50);not null" json:"name"`
	Code       string `gorm:"uniqueIndex;type:varchar(50);not null" json:"code"`
	Status     int    `gorm:"default:0" json:"status"`
	Sort       int    `gorm:"default:0" json:"sort"`
	Desc       string `gorm:"type:varchar(255)" json:"desc"`
	DataScope  int    `gorm:"default:5;comment:1-全部 2-自定义 3-本部门 4-本部门及以下 5-仅本人" json:"data_scope"`
	Menus      []Menu `gorm:"many2many:sys_role_menus;" json:"menus,omitempty"`
	Depts      []Dept `gorm:"many2many:sys_role_depts;" json:"depts,omitempty"`
}
