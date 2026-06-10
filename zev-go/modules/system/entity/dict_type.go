package entity

import "gorm.io/gorm"

type DictType struct {
	gorm.Model `swagger_tag:"系统管理-字典类型" swagger_path:"/api/system/dict/type"`
	Name   string `gorm:"type:varchar(100);not null" json:"name"`
	Type   string `gorm:"uniqueIndex;type:varchar(100);not null" json:"type"`
	Status int    `gorm:"default:0" json:"status"` // 0-正常 1-停用
	Remark string `gorm:"type:varchar(500)" json:"remark"`
}
