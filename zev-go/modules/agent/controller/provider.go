package controller

import (
	"strconv"

	"zev-go/modules/agent/dto"
	"zev-go/modules/agent/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type ProviderController struct {
	providerSvc *service.ProviderService
}

func NewProviderController(providerSvc *service.ProviderService) *ProviderController {
	return &ProviderController{providerSvc: providerSvc}
}

// List 获取模型供应商分页列表
// @Summary 获取模型供应商列表
// @Tags 智能体中心-模型网关
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param keyword query string false "关键词"
// @Param providerType query string false "供应商类型"
// @Success 200 {object} response.Response "成功"
// @Router /api/agent/provider/list [get]
func (c *ProviderController) List(ctx *gin.Context) {
	var req dto.ProviderListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误: "+err.Error(), ctx)
		return
	}
	list, total, err := c.providerSvc.List(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取模型供应商失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(map[string]any{"list": list, "total": total}, ctx)
}

// Options 获取已启用的模型供应商下拉选项
// @Summary 获取可用模型供应商选项
// @Tags 智能体中心-模型网关
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=[]dto.ProviderOptionRes} "成功"
// @Router /api/agent/provider/options [get]
func (c *ProviderController) Options(ctx *gin.Context) {
	list, err := c.providerSvc.Options(middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取模型供应商选项失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(list, ctx)
}

// Get 获取单个模型供应商详情
// @Summary 获取模型供应商详情
// @Tags 智能体中心-模型网关
// @Produce json
// @Security Bearer
// @Param id path int true "供应商 ID"
// @Success 200 {object} response.Response{data=dto.ProviderRes} "成功"
// @Router /api/agent/provider/get/{id} [get]
func (c *ProviderController) Get(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的供应商 ID", ctx)
		return
	}
	res, err := c.providerSvc.Get(uint(id), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取模型供应商失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Create 新增模型供应商配置
// @Summary 新增模型供应商
// @Tags 智能体中心-模型网关
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.ProviderCreateReq true "供应商配置"
// @Success 200 {object} response.Response{data=dto.ProviderRes} "成功"
// @Router /api/agent/provider/create [post]
func (c *ProviderController) Create(ctx *gin.Context) {
	var req dto.ProviderCreateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.providerSvc.Create(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("创建模型供应商失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Update 更新模型供应商配置
// @Summary 更新模型供应商
// @Tags 智能体中心-模型网关
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.ProviderUpdateReq true "供应商配置"
// @Success 200 {object} response.Response{data=dto.ProviderRes} "成功"
// @Router /api/agent/provider/update [put]
func (c *ProviderController) Update(ctx *gin.Context) {
	var req dto.ProviderUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.providerSvc.Update(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("更新模型供应商失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Delete 删除模型供应商配置
// @Summary 删除模型供应商
// @Tags 智能体中心-模型网关
// @Produce json
// @Security Bearer
// @Param id path int true "供应商 ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/agent/provider/delete/{id} [delete]
func (c *ProviderController) Delete(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的供应商 ID", ctx)
		return
	}
	if err := c.providerSvc.Delete(uint(id), middleware.GetDataScope(ctx)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Ping 测试模型供应商接口连通性与响应延迟
// @Summary 探活模型供应商连通性
// @Tags 智能体中心-模型网关
// @Produce json
// @Security Bearer
// @Param id path int true "供应商 ID"
// @Success 200 {object} response.Response{data=dto.ProviderPingRes} "成功"
// @Router /api/agent/provider/ping/{id} [post]
func (c *ProviderController) Ping(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的供应商 ID", ctx)
		return
	}
	res, err := c.providerSvc.Ping(ctx.Request.Context(), uint(id), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}
