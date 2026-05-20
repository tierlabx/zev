package entity

import "gorm.io/gorm"

type DictType struct {
	gorm.Model
	Name   string `gorm:"type:varchar(100);not null" json:"name"`
	Type   string `gorm:"uniqueIndex;type:varchar(100);not null" json:"type"`
	Status int    `gorm:"default:0" json:"status"` // 0-正常 1-停用
	Remark string `gorm:"type:varchar(500)" json:"remark"`
}
