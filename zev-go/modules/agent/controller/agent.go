package controller

import (
	"strconv"

	"zev-go/modules/agent/dto"
	"zev-go/modules/agent/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type AgentController struct {
	agentSvc *service.AgentService
}

func NewAgentController(agentSvc *service.AgentService) *AgentController {
	return &AgentController{agentSvc: agentSvc}
}

// List 获取智能体编排列表
// @Summary 获取智能体列表
// @Tags 智能体中心-编排管理
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param keyword query string false "关键词"
// @Success 200 {object} response.Response "成功"
// @Router /api/agent/definition/list [get]
func (c *AgentController) List(ctx *gin.Context) {
	var req dto.AgentListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误: "+err.Error(), ctx)
		return
	}
	list, total, err := c.agentSvc.List(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取智能体列表失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(map[string]any{"list": list, "total": total}, ctx)
}

// Options 获取已启用的智能体下拉列表
// @Summary 获取可用智能体选项
// @Tags 智能体中心-编排管理
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=[]dto.AgentOptionRes} "成功"
// @Router /api/agent/definition/options [get]
func (c *AgentController) Options(ctx *gin.Context) {
	list, err := c.agentSvc.Options(middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取智能体选项失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(list, ctx)
}

// Get 获取单个智能体配置详情
// @Summary 获取智能体详情
// @Tags 智能体中心-编排管理
// @Produce json
// @Security Bearer
// @Param id path int true "智能体 ID"
// @Success 200 {object} response.Response{data=dto.AgentRes} "成功"
// @Router /api/agent/definition/get/{id} [get]
func (c *AgentController) Get(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的智能体 ID", ctx)
		return
	}
	res, err := c.agentSvc.Get(uint(id), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取智能体失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Create 新增智能体定义
// @Summary 新增智能体
// @Tags 智能体中心-编排管理
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.AgentCreateReq true "智能体定义"
// @Success 200 {object} response.Response{data=dto.AgentRes} "成功"
// @Router /api/agent/definition/create [post]
func (c *AgentController) Create(ctx *gin.Context) {
	var req dto.AgentCreateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.agentSvc.Create(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("创建智能体失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Update 更新智能体定义
// @Summary 更新智能体
// @Tags 智能体中心-编排管理
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.AgentUpdateReq true "智能体定义"
// @Success 200 {object} response.Response{data=dto.AgentRes} "成功"
// @Router /api/agent/definition/update [put]
func (c *AgentController) Update(ctx *gin.Context) {
	var req dto.AgentUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.agentSvc.Update(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("更新智能体失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Delete 删除智能体定义
// @Summary 删除智能体
// @Tags 智能体中心-编排管理
// @Produce json
// @Security Bearer
// @Param id path int true "智能体 ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/agent/definition/delete/{id} [delete]
func (c *AgentController) Delete(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的智能体 ID", ctx)
		return
	}
	if err := c.agentSvc.Delete(uint(id), middleware.GetDataScope(ctx)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Tools 获取内置工具与可选 MCP 工具目录
// @Summary 获取可用工具目录
// @Tags 智能体中心-编排管理
// @Produce json
// @Security Bearer
// @Param agentId query int false "智能体 ID（可选，用于同步探测 MCP 工具）"
// @Success 200 {object} response.Response{data=dto.ToolCatalogRes} "成功"
// @Router /api/agent/definition/tools [get]
func (c *AgentController) Tools(ctx *gin.Context) {
	agentID, _ := strconv.ParseUint(ctx.Query("agentId"), 10, 64)
	res := c.agentSvc.ListTools(ctx.Request.Context(), uint(agentID), middleware.GetDataScope(ctx))
	response.SuccessData(res, ctx)
}
