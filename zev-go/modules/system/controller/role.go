package controller

import (
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
)

type RoleController struct {
	*crud.BaseController[entity.Role]
	roleService *service.RoleService
}

func NewRoleController(roleService *service.RoleService) *RoleController {
	return &RoleController{
		BaseController: crud.NewBaseController[entity.Role](roleService.BaseService),
		roleService:    roleService,
	}
}
