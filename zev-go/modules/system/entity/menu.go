package entity

import "gorm.io/gorm"

type Menu struct {
	gorm.Model
	ParentID  uint   `gorm:"default:0" json:"parent_id"`
	Name      string `gorm:"type:varchar(50);not null" json:"name"`
	Path      string `gorm:"type:varchar(255)" json:"path"`
	Component string `gorm:"type:varchar(255)" json:"component"`
	Icon      string `gorm:"type:varchar(100)" json:"icon"`
	Sort      int    `gorm:"default:0" json:"sort"`
	Type      string `gorm:"type:char(1);default:'C'" json:"type"` // M-目录 C-菜单 F-按钮
	Perms     string `gorm:"type:varchar(100)" json:"perms"`
}
