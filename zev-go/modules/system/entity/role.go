package entity

import (
	"gorm.io/gorm"
)

type Role struct {
	gorm.Model
	Name string `gorm:"uniqueIndex;type:varchar(50);not null" json:"name"`
	Desc string `gorm:"type:varchar(255)" json:"desc"`
}
