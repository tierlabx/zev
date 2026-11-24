package controller

import (
	"strconv"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/middleware"
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

// Create 创建角色
// @Summary 创建角色
// @Description 新增角色并设置初始数据范围
// @Tags 系统管理-角色
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.RoleCreateUpdateReq true "角色信息"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/role/create [post]
func (c *RoleController) Create(ctx *gin.Context) {
	var req dto.RoleCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	if err := c.roleService.CreateRole(middleware.GetDataScope(ctx), req); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Update 更新角色
// @Summary 更新角色
// @Description 更新角色基础信息
// @Tags 系统管理-角色
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.RoleCreateUpdateReq true "角色信息"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/role/update [put]
func (c *RoleController) Update(ctx *gin.Context) {
	var req dto.RoleCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	if err := c.roleService.UpdateRole(middleware.GetDataScope(ctx), req); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Delete 删除角色
// @Summary 删除角色
// @Description 删除非超管角色并校验用户绑定关系
// @Tags 系统管理-角色
// @Produce json
// @Security Bearer
// @Param id path int true "角色ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/role/delete/{id} [delete]
func (c *RoleController) Delete(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的角色ID", ctx)
		return
	}

	if err := c.roleService.DeleteRole(middleware.GetDataScope(ctx), uint(id)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
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

// GetDataScope 获取角色数据权限配置
// @Summary 获取角色数据权限
// @Description 获取角色的数据权限范围及自定义部门列表
// @Tags 系统管理-角色
// @Produce json
// @Param id path int true "角色ID"
// @Security Bearer
// @Success 200 {object} response.Response{data=dto.RoleDataScopeRes} "成功"
// @Router /api/system/role/datascope/{id} [get]
func (c *RoleController) GetDataScope(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的角色ID", ctx)
		return
	}

	res, err := c.roleService.GetRoleDataScope(uint(id))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// AssignDataScope 配置角色数据权限范围
// @Summary 配置角色数据权限
// @Description 设置角色的数据权限范围(1~5)及自定义授权部门列表
// @Tags 系统管理-角色
// @Accept json
// @Produce json
// @Param id path int true "角色ID"
// @Param req body dto.AssignRoleDataScopeReq true "数据权限配置"
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/role/datascope/{id} [put]
func (c *RoleController) AssignDataScope(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的角色ID", ctx)
		return
	}

	var req dto.AssignRoleDataScopeReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请求参数错误", ctx)
		return
	}

	if err := c.roleService.AssignDataScope(middleware.GetDataScope(ctx), uint(id), req); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// List 重写获取角色列表，支持 keyword 模糊搜索
// @Summary 获取角色列表
// @Description 获取分页角色列表，支持按名称、编码进行 keyword 模糊搜索
// @Tags 系统管理-角色
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param keyword query string false "搜索关键词"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/role/list [get]
func (c *RoleController) List(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("pageSize", "10"))
	keyword := ctx.Query("keyword")

	list, total, err := c.roleService.ListWithKeyword(page, pageSize, keyword)
	if err != nil {
		response.FailMessage("获取列表失败", ctx)
		return
	}

	response.SuccessData(map[string]interface{}{
		"list":  list,
		"total": total,
	}, ctx)
}
