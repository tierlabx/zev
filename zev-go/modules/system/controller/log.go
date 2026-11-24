package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type LogController struct {
	logService *service.LogService
}

func NewLogController(logService *service.LogService) *LogController {
	return &LogController{logService: logService}
}

// GetStats 获取日志概览统计
// @Summary 获取日志审计今日概览
// @Tags 系统管理-日志审计
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=dto.LogStatsRes} "成功"
// @Router /api/system/log/stats [get]
func (c *LogController) GetStats(ctx *gin.Context) {
	res, err := c.logService.GetStats(middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取日志统计失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// ListOperLogs 获取操作日志分页列表
// @Summary 分页查询操作日志
// @Tags 系统管理-日志审计
// @Produce json
// @Security Bearer
// @Param query query dto.OperLogListReq false "查询参数"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/log/oper/list [get]
func (c *LogController) ListOperLogs(ctx *gin.Context) {
	var req dto.OperLogListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误", ctx)
		return
	}
	res, err := c.logService.ListOperLogs(middleware.GetDataScope(ctx), req)
	if err != nil {
		response.FailMessage("获取操作日志失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// GetOperLog 获取单条操作日志详情
// @Summary 获取操作日志详情
// @Tags 系统管理-日志审计
// @Produce json
// @Security Bearer
// @Param id path int true "日志ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/log/oper/get/{id} [get]
func (c *LogController) GetOperLog(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的日志ID", ctx)
		return
	}
	res, err := c.logService.GetOperLogByID(middleware.GetDataScope(ctx), uint(id))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// DeleteOperLogs 批量删除操作日志
// @Summary 批量删除操作日志
// @Tags 系统管理-日志审计
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.BatchDeleteLogReq true "日志ID列表"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/log/oper/delete [delete]
func (c *LogController) DeleteOperLogs(ctx *gin.Context) {
	var req dto.BatchDeleteLogReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请选择需要删除的日志", ctx)
		return
	}
	if err := c.logService.DeleteOperLogs(middleware.GetDataScope(ctx), req.IDs); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ClearOperLogs 清空全部操作日志
// @Summary 清空全部操作日志
// @Tags 系统管理-日志审计
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/log/oper/clear [post]
func (c *LogController) ClearOperLogs(ctx *gin.Context) {
	if err := c.logService.ClearOperLogs(middleware.GetDataScope(ctx)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ExportOperLogs 导出操作日志为 CSV
// @Summary 导出操作日志
// @Tags 系统管理-日志审计
// @Produce text/csv
// @Security Bearer
// @Param query query dto.OperLogListReq false "筛选参数"
// @Success 200 {file} file "CSV文件流"
// @Router /api/system/log/oper/export [get]
func (c *LogController) ExportOperLogs(ctx *gin.Context) {
	var req dto.OperLogListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("导出参数错误", ctx)
		return
	}
	data, err := c.logService.ExportOperLogsCSV(middleware.GetDataScope(ctx), req)
	if err != nil {
		response.FailMessage("导出操作日志失败: "+err.Error(), ctx)
		return
	}
	filename := fmt.Sprintf("oper-logs-%s.csv", time.Now().Format("20060102-150405"))
	ctx.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	ctx.Data(http.StatusOK, "text/csv; charset=utf-8", data)
}

// ListLoginLogs 获取登录日志分页列表
// @Summary 分页查询登录日志
// @Tags 系统管理-日志审计
// @Produce json
// @Security Bearer
// @Param query query dto.LoginLogListReq false "查询参数"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/log/login/list [get]
func (c *LogController) ListLoginLogs(ctx *gin.Context) {
	var req dto.LoginLogListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误", ctx)
		return
	}
	res, err := c.logService.ListLoginLogs(middleware.GetDataScope(ctx), req)
	if err != nil {
		response.FailMessage("获取登录日志失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// DeleteLoginLogs 批量删除登录日志
// @Summary 批量删除登录日志
// @Tags 系统管理-日志审计
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.BatchDeleteLogReq true "日志ID列表"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/log/login/delete [delete]
func (c *LogController) DeleteLoginLogs(ctx *gin.Context) {
	var req dto.BatchDeleteLogReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请选择需要删除的日志", ctx)
		return
	}
	if err := c.logService.DeleteLoginLogs(middleware.GetDataScope(ctx), req.IDs); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ClearLoginLogs 清空全部登录日志
// @Summary 清空全部登录日志
// @Tags 系统管理-日志审计
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/log/login/clear [post]
func (c *LogController) ClearLoginLogs(ctx *gin.Context) {
	if err := c.logService.ClearLoginLogs(middleware.GetDataScope(ctx)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ExportLoginLogs 导出登录日志为 CSV
// @Summary 导出登录日志
// @Tags 系统管理-日志审计
// @Produce text/csv
// @Security Bearer
// @Param query query dto.LoginLogListReq false "筛选参数"
// @Success 200 {file} file "CSV文件流"
// @Router /api/system/log/login/export [get]
func (c *LogController) ExportLoginLogs(ctx *gin.Context) {
	var req dto.LoginLogListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("导出参数错误", ctx)
		return
	}
	data, err := c.logService.ExportLoginLogsCSV(middleware.GetDataScope(ctx), req)
	if err != nil {
		response.FailMessage("导出登录日志失败: "+err.Error(), ctx)
		return
	}
	filename := fmt.Sprintf("login-logs-%s.csv", time.Now().Format("20060102-150405"))
	ctx.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	ctx.Data(http.StatusOK, "text/csv; charset=utf-8", data)
}
