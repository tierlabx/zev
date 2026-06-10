package entity

import (
	"errors"
	"gorm.io/gorm"
)

type Menu struct {
	gorm.Model `swagger_tag:"系统管理-菜单" swagger_path:"/api/system/menu"`
	ParentID  uint   `gorm:"default:0" json:"parent_id"`
	Name      string `gorm:"type:varchar(50);not null" json:"name"`
	Path      string `gorm:"type:varchar(255)" json:"path"`
	Component string `gorm:"type:varchar(255)" json:"component"`
	Icon      string `gorm:"type:varchar(100)" json:"icon"`
	Sort      int    `gorm:"default:0" json:"sort"`
	Type      string `gorm:"type:char(1);default:'C'" json:"type"` // M-目录 C-菜单 F-按钮
	Perms     string `gorm:"type:varchar(100)" json:"perms"`
}

// BeforeSave GORM 钩子：在保存前进行数据校验和清洗
func (m *Menu) BeforeSave(tx *gorm.DB) (err error) {
	switch m.Type {
	case "M": // 目录
		m.Component = ""
		m.Perms = ""
	case "C": // 菜单
		if m.Path == "" || m.Component == "" {
			return errors.New("菜单类型的路由路径和组件路径不能为空")
		}
	case "F": // 按钮
		if m.Perms == "" {
			return errors.New("按钮类型的权限标识不能为空")
		}
		m.Path = ""
		m.Component = ""
		m.Icon = ""
	}
	return nil
}
