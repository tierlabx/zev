package controller

import (
	"strconv"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
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

// AssignMenus 分配菜单
// @Summary 分配菜单
// @Description 给角色分配菜单
// @Tags 系统管理-角色
// @Accept json
// @Produce json
// @Param id path int true "角色ID"
// @Param req body dto.AssignRoleMenusReq true "菜单ID列表"
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/role/menus/{id} [post]
func (c *RoleController) AssignMenus(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, _ := strconv.Atoi(idStr)

	var req dto.AssignRoleMenusReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请求参数错误", ctx)
		return
	}

	if err := c.roleService.AssignMenus(uint(id), req.MenuIDs); err != nil {
		response.FailMessage("分配菜单失败", ctx)
		return
	}

	response.Success(ctx)
}

// GetRoleMenus 获取角色菜单
// @Summary 获取角色菜单
// @Description 获取角色已分配的菜单ID列表
// @Tags 系统管理-角色
// @Accept json
// @Produce json
// @Param id path int true "角色ID"
// @Security Bearer
// @Success 200 {object} response.Response{data=[]uint} "成功"
// @Router /api/system/role/menus/{id} [get]
func (c *RoleController) GetRoleMenus(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, _ := strconv.Atoi(idStr)

	menuIDs, err := c.roleService.GetRoleMenuIDs(uint(id))
	if err != nil {
		response.FailMessage("获取角色菜单失败", ctx)
		return
	}

	response.SuccessData(menuIDs, ctx)
}
