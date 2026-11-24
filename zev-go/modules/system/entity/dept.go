package entity

import "gorm.io/gorm"

// Dept 系统部门/组织架构实体，使用 ancestors 物化路径支持高效子树过滤
type Dept struct {
	gorm.Model `swagger_tag:"系统管理-部门" swagger_path:"/api/system/dept"`
	ParentID   uint   `gorm:"default:0;index" json:"parent_id"`
	Ancestors  string `gorm:"type:varchar(255);default:'0';index" json:"ancestors"`
	Name       string `gorm:"type:varchar(50);not null" json:"name"`
	Code       string `gorm:"uniqueIndex;type:varchar(50);not null" json:"code"`
	Leader     string `gorm:"type:varchar(50)" json:"leader"`
	Phone      string `gorm:"type:varchar(20)" json:"phone"`
	Email      string `gorm:"type:varchar(100)" json:"email"`
	Sort       int    `gorm:"default:0" json:"sort"`
	Status     int    `gorm:"default:0;comment:0-正常 1-停用" json:"status"`
}
