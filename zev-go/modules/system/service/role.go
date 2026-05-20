package service

import (
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"

	"gorm.io/gorm"
)

type RoleService struct {
	*crud.BaseService[entity.Role]
}

func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{
		BaseService: crud.NewBaseService[entity.Role](db),
	}
}
