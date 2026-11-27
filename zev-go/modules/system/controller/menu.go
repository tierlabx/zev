package controller

import (
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type MenuController struct {
	*crud.BaseController[entity.Menu]
	menuService *service.MenuService
}

func NewMenuController(menuService *service.MenuService) *MenuController {
	return &MenuController{
		BaseController: crud.NewBaseController[entity.Menu](menuService.BaseService),
		menuService:    menuService,
	}
}

// Tree 获取菜单树
// @Summary 获取菜单树
// @Description 获取包含层级关系的菜单树
// @Tags 系统管理-菜单
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/menu/tree [get]
func (c *MenuController) Tree(ctx *gin.Context) {
	tree, err := c.menuService.GetMenuTree()
	if err != nil {
		response.FailMessage("获取菜单树失败", ctx)
		return
	}
	response.SuccessData(tree, ctx)
}

// PermOptions 获取权限标识级联树
// @Summary 获取权限标识级联树
// @Description 返回合并路由注册权限与存量菜单权限的多级树形结构
// @Tags 系统管理-菜单
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/menu/perms [get]
func (c *MenuController) PermOptions(ctx *gin.Context) {
	tree, err := c.menuService.GetPermissionTree()
	if err != nil {
		response.FailMessage("获取权限选项失败", ctx)
		return
	}
	response.SuccessData(tree, ctx)
}
