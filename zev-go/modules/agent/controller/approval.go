package controller

import (
	"strconv"

	"zev-go/modules/agent/dto"
	"zev-go/modules/agent/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type ApprovalController struct {
	approvalSvc *service.ApprovalService
}

func NewApprovalController(approvalSvc *service.ApprovalService) *ApprovalController {
	return &ApprovalController{approvalSvc: approvalSvc}
}

// List 获取高危工具审批单列表
// @Summary 获取工具审批列表
// @Tags 智能体中心-人机审批
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param status query string false "状态过滤"
// @Success 200 {object} response.Response "成功"
// @Router /api/agent/approval/list [get]
func (c *ApprovalController) List(ctx *gin.Context) {
	var req dto.ApprovalListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误: "+err.Error(), ctx)
		return
	}
	list, total, err := c.approvalSvc.List(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取审批列表失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(map[string]any{"list": list, "total": total}, ctx)
}

// PendingCount 获取待处理审批单数量
// @Summary 获取待审批计数
// @Tags 智能体中心-人机审批
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=dto.ApprovalPendingCountRes} "成功"
// @Router /api/agent/approval/pending-count [get]
func (c *ApprovalController) PendingCount(ctx *gin.Context) {
	count, err := c.approvalSvc.PendingCount(middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取待审批计数失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(dto.ApprovalPendingCountRes{Count: count}, ctx)
}

// Decide 审批通过或拒绝高危工具调用并唤醒挂起的 Run
// @Summary 处理高危工具审批单
// @Tags 智能体中心-人机审批
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path int true "审批单 ID"
// @Param data body dto.ApprovalDecideReq true "审批决策"
// @Success 200 {object} response.Response{data=dto.ApprovalRes} "成功"
// @Router /api/agent/approval/decide/{id} [post]
func (c *ApprovalController) Decide(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的审批单 ID", ctx)
		return
	}
	var req dto.ApprovalDecideReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.approvalSvc.Decide(uint(id), req, ctx.GetUint("userID"), ctx.GetString("username"), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}
