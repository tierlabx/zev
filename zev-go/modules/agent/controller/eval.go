package controller

import (
	"strconv"

	"zev-go/modules/agent/dto"
	"zev-go/modules/agent/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type EvalController struct {
	evalSvc *service.EvalService
}

func NewEvalController(evalSvc *service.EvalService) *EvalController {
	return &EvalController{evalSvc: evalSvc}
}

// ListDatasets 获取评测数据集列表
// @Summary 获取评测集列表
// @Tags 智能体中心-评测回归
// @Produce json
// @Security Bearer
// @Router /api/agent/eval/dataset/list [get]
func (c *EvalController) ListDatasets(ctx *gin.Context) {
	var req dto.EvalDatasetListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误: "+err.Error(), ctx)
		return
	}
	list, total, err := c.evalSvc.ListDatasets(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取评测集失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(map[string]any{"list": list, "total": total}, ctx)
}

// CreateDataset 新增评测数据集
// @Summary 新增评测集
// @Tags 智能体中心-评测回归
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.EvalDatasetCreateReq true "评测集"
// @Router /api/agent/eval/dataset/create [post]
func (c *EvalController) CreateDataset(ctx *gin.Context) {
	var req dto.EvalDatasetCreateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.evalSvc.CreateDataset(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// UpdateDataset 更新评测数据集
// @Summary 更新评测集
// @Tags 智能体中心-评测回归
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.EvalDatasetUpdateReq true "评测集"
// @Router /api/agent/eval/dataset/update [put]
func (c *EvalController) UpdateDataset(ctx *gin.Context) {
	var req dto.EvalDatasetUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.evalSvc.UpdateDataset(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// DeleteDataset 删除评测数据集
// @Summary 删除评测集
// @Tags 智能体中心-评测回归
// @Produce json
// @Security Bearer
// @Param id path int true "评测集 ID"
// @Router /api/agent/eval/dataset/delete/{id} [delete]
func (c *EvalController) DeleteDataset(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的评测集 ID", ctx)
		return
	}
	if err := c.evalSvc.DeleteDataset(uint(id), middleware.GetDataScope(ctx)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ListCases 获取指定数据集下的全部评测用例
// @Summary 获取评测用例列表
// @Tags 智能体中心-评测回归
// @Produce json
// @Security Bearer
// @Param datasetId query int true "评测集 ID"
// @Router /api/agent/eval/case/list [get]
func (c *EvalController) ListCases(ctx *gin.Context) {
	datasetID, err := strconv.ParseUint(ctx.Query("datasetId"), 10, 64)
	if err != nil || datasetID == 0 {
		response.FailMessage("缺少有效的 datasetId 参数", ctx)
		return
	}
	list, err := c.evalSvc.ListCases(uint(datasetID), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(list, ctx)
}

// CreateCase 新增评测用例
// @Summary 新增评测用例
// @Tags 智能体中心-评测回归
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.EvalCaseCreateReq true "评测用例"
// @Router /api/agent/eval/case/create [post]
func (c *EvalController) CreateCase(ctx *gin.Context) {
	var req dto.EvalCaseCreateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.evalSvc.CreateCase(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// UpdateCase 更新评测用例
// @Summary 更新评测用例
// @Tags 智能体中心-评测回归
// @Accept json
// @Produce json
// @Security Bearer
// @Param data body dto.EvalCaseUpdateReq true "评测用例"
// @Router /api/agent/eval/case/update [put]
func (c *EvalController) UpdateCase(ctx *gin.Context) {
	var req dto.EvalCaseUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	res, err := c.evalSvc.UpdateCase(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// DeleteCase 删除评测用例
// @Summary 删除评测用例
// @Tags 智能体中心-评测回归
// @Produce json
// @Security Bearer
// @Param id path int true "用例 ID"
// @Router /api/agent/eval/case/delete/{id} [delete]
func (c *EvalController) DeleteCase(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的用例 ID", ctx)
		return
	}
	if err := c.evalSvc.DeleteCase(uint(id), middleware.GetDataScope(ctx)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ExecuteRun 对指定数据集触发一次回归评测并返回评测报告
// @Summary 执行评测集回归任务
// @Tags 智能体中心-评测回归
// @Produce json
// @Security Bearer
// @Param datasetId path int true "评测集 ID"
// @Router /api/agent/eval/run/execute/{datasetId} [post]
func (c *EvalController) ExecuteRun(ctx *gin.Context) {
	datasetID, err := strconv.ParseUint(ctx.Param("datasetId"), 10, 64)
	if err != nil || datasetID == 0 {
		response.FailMessage("无效的评测集 ID", ctx)
		return
	}
	res, err := c.evalSvc.ExecuteDataset(ctx.Request.Context(), uint(datasetID), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// ListRuns 获取历史评测报告列表
// @Summary 获取历史评测报告列表
// @Tags 智能体中心-评测回归
// @Produce json
// @Security Bearer
// @Param datasetId query int false "评测集 ID"
// @Router /api/agent/eval/run/list [get]
func (c *EvalController) ListRuns(ctx *gin.Context) {
	var req dto.EvalRunListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误: "+err.Error(), ctx)
		return
	}
	list, total, err := c.evalSvc.ListRuns(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(map[string]any{"list": list, "total": total}, ctx)
}

// RunDetail 获取单次评测批次详情与逐用例得分
// @Summary 获取评测报告详情
// @Tags 智能体中心-评测回归
// @Produce json
// @Security Bearer
// @Param id path int true "评测批次 ID"
// @Router /api/agent/eval/run/detail/{id} [get]
func (c *EvalController) RunDetail(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的评测报告 ID", ctx)
		return
	}
	res, err := c.evalSvc.GetRunDetail(uint(id), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}
