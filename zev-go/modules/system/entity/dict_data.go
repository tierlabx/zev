package entity

import "gorm.io/gorm"

type DictData struct {
	gorm.Model `swagger_tag:"系统管理-字典数据" swagger_path:"/api/system/dict/data"`
	DictType string `gorm:"type:varchar(100);not null;index" json:"dict_type"`
	Label    string `gorm:"type:varchar(100);not null" json:"label"`
	Value    string `gorm:"type:varchar(100);not null" json:"value"`
	Sort     int    `gorm:"default:0" json:"sort"`
	Status   int    `gorm:"default:0" json:"status"` // 0-正常 1-停用
	Remark   string `gorm:"type:varchar(500)" json:"remark"`
}
