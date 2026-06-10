package entity

import (
	"gorm.io/gorm"
)

type Role struct {
	gorm.Model `swagger_tag:"系统管理-角色" swagger_path:"/api/system/role"`
	Name   string `gorm:"type:varchar(50);not null" json:"name"`
	Code   string `gorm:"uniqueIndex;type:varchar(50);not null" json:"code"`
	Status int    `gorm:"default:0" json:"status"`
	Sort   int    `gorm:"default:0" json:"sort"`
	Desc   string `gorm:"type:varchar(255)" json:"desc"`
	Menus  []Menu `gorm:"many2many:sys_role_menus;" json:"menus,omitempty"`
}
