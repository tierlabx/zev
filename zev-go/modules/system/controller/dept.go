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

type DeptController struct {
	*crud.BaseController[entity.Dept]
	deptService *service.DeptService
}

func NewDeptController(deptService *service.DeptService) *DeptController {
	return &DeptController{
		BaseController: crud.NewBaseController[entity.Dept](deptService.BaseService),
		deptService:    deptService,
	}
}

// Tree 获取受当前用户数据范围约束的部门树
// @Summary 获取部门树
// @Description 获取按当前用户数据权限过滤后的部门树，支持关键词和状态筛选
// @Tags 系统管理-部门
// @Produce json
// @Security Bearer
// @Param keyword query string false "关键词(名称/编码/负责人)"
// @Param status query int false "状态(0正常 1停用)"
// @Success 200 {object} response.Response{data=[]dto.DeptTreeRes} "成功"
// @Router /api/system/dept/tree [get]
func (c *DeptController) Tree(ctx *gin.Context) {
	keyword := ctx.Query("keyword")
	var statusPtr *int
	if statusStr := ctx.Query("status"); statusStr != "" {
		if sVal, err := strconv.Atoi(statusStr); err == nil {
			statusPtr = &sVal
		}
	}

	tree, err := c.deptService.GetDeptTree(middleware.GetDataScope(ctx), keyword, statusPtr, false)
	if err != nil {
		response.FailMessage("获取部门树失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(tree, ctx)
}

// OptionsTree 获取完整部门选项树（供角色配置自定义数据权限使用）
// @Summary 获取完整部门选项树
// @Description 获取未按个人数据范围裁剪的启用部门树选项
// @Tags 系统管理-部门
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=[]dto.DeptTreeRes} "成功"
// @Router /api/system/dept/options [get]
func (c *DeptController) OptionsTree(ctx *gin.Context) {
	tree, err := c.deptService.GetDeptTree(middleware.GetDataScope(ctx), "", nil, true)
	if err != nil {
		response.FailMessage("获取部门选项失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(tree, ctx)
}

// Create 新增部门
// @Summary 新增部门
// @Description 创建新部门并校验父级部门及数据范围权限
// @Tags 系统管理-部门
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.DeptCreateUpdateReq true "部门信息"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/dept/create [post]
func (c *DeptController) Create(ctx *gin.Context) {
	var req dto.DeptCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	if err := c.deptService.CreateDept(middleware.GetDataScope(ctx), req); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Update 更新部门
// @Summary 更新部门
// @Description 更新部门信息并级联维护下级部门路径
// @Tags 系统管理-部门
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.DeptCreateUpdateReq true "部门信息"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/dept/update [put]
func (c *DeptController) Update(ctx *gin.Context) {
	var req dto.DeptCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	if err := c.deptService.UpdateDept(middleware.GetDataScope(ctx), req); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// List 获取受数据权限约束的部门分页列表
// @Summary 获取部门列表
// @Description 获取分页部门列表，支持关键词搜索且受数据权限约束
// @Tags 系统管理-部门
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param keyword query string false "搜索关键词"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/dept/list [get]
func (c *DeptController) List(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("pageSize", "10"))
	keyword := ctx.Query("keyword")

	list, total, err := c.deptService.ListWithFilter(middleware.GetDataScope(ctx), page, pageSize, keyword)
	if err != nil {
		response.FailMessage("获取部门列表失败", ctx)
		return
	}
	response.SuccessData(map[string]interface{}{
		"list":  list,
		"total": total,
	}, ctx)
}

// Get 获取单条部门详情（校验数据范围）
// @Summary 获取部门详情
// @Description 根据ID获取部门详情并校验数据权限
// @Tags 系统管理-部门
// @Produce json
// @Security Bearer
// @Param id path int true "部门ID"
// @Success 200 {object} response.Response{data=entity.Dept} "成功"
// @Router /api/system/dept/get/{id} [get]
func (c *DeptController) Get(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的部门ID", ctx)
		return
	}

	dept, err := c.deptService.GetDeptByID(middleware.GetDataScope(ctx), uint(id))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(dept, ctx)
}

// Delete 删除部门
// @Summary 删除部门
// @Description 删除部门（校验子部门及用户占用与数据范围）
// @Tags 系统管理-部门
// @Produce json
// @Security Bearer
// @Param id path int true "部门ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/dept/delete/{id} [delete]
func (c *DeptController) Delete(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的部门ID", ctx)
		return
	}

	if err := c.deptService.DeleteDept(middleware.GetDataScope(ctx), uint(id)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}
