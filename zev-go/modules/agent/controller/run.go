package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"zev-go/modules/agent/dto"
	agentrt "zev-go/modules/agent/engine/runtime"
	"zev-go/modules/agent/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type RunController struct {
	runSvc *service.RunService
}

func NewRunController(runSvc *service.RunService) *RunController {
	return &RunController{runSvc: runSvc}
}

// Stream 启动智能体流式对话运行 (SSE)
// @Summary 启动智能体流式对话 (SSE)
// @Tags 智能体中心-运行与轨迹
// @Accept json
// @Produce text/event-stream
// @Security Bearer
// @Param data body dto.RunStreamReq true "运行输入"
// @Router /api/agent/run/stream [post]
func (c *RunController) Stream(ctx *gin.Context) {
	var req dto.RunStreamReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数校验失败: "+err.Error(), ctx)
		return
	}
	flusher, ok := ctx.Writer.(http.Flusher)
	if !ok {
		response.FailMessage("当前响应器不支持流式输出", ctx)
		return
	}

	ctx.Writer.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	ctx.Writer.Header().Set("Cache-Control", "no-cache")
	ctx.Writer.Header().Set("Connection", "keep-alive")
	ctx.Writer.Header().Set("X-Accel-Buffering", "no")

	_, _ = fmt.Fprint(ctx.Writer, ": connected\n\n")
	flusher.Flush()

	var writeMu sync.Mutex
	sendEvent := func(evt agentrt.Event) {
		payload, err := json.Marshal(evt)
		if err != nil {
			return
		}
		writeMu.Lock()
		defer writeMu.Unlock()
		_, _ = fmt.Fprintf(ctx.Writer, "event: %s\ndata: %s\n\n", evt.Type, payload)
		flusher.Flush()
	}

	username := ctx.GetString("username")
	_, err := c.runSvc.ExecuteStream(ctx.Request.Context(), req, middleware.GetDataScope(ctx), username, sendEvent)
	if err != nil {
		sendEvent(agentrt.Event{
			Type:   agentrt.EventError,
			Status: "failed",
			Reason: err.Error(),
		})
	}
}

// List 检索历史运行轨迹列表
// @Summary 获取执行轨迹列表
// @Tags 智能体中心-运行与轨迹
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param agentId query int false "智能体 ID"
// @Param status query string false "状态过滤"
// @Param keyword query string false "关键词"
// @Success 200 {object} response.Response "成功"
// @Router /api/agent/run/list [get]
func (c *RunController) List(ctx *gin.Context) {
	var req dto.RunListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误: "+err.Error(), ctx)
		return
	}
	list, total, err := c.runSvc.List(req, middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取轨迹列表失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(map[string]any{"list": list, "total": total}, ctx)
}

// Detail 获取单次执行详情及全链路 Span 树
// @Summary 获取轨迹详情与 Span 瀑布数据
// @Tags 智能体中心-运行与轨迹
// @Produce json
// @Security Bearer
// @Param id path int true "Run ID"
// @Success 200 {object} response.Response{data=dto.RunDetailRes} "成功"
// @Router /api/agent/run/detail/{id} [get]
func (c *RunController) Detail(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的轨迹 ID", ctx)
		return
	}
	res, err := c.runSvc.Detail(uint(id), middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Heartbeats 获取近期运行状态心跳条数据
// @Summary 获取近期运行心跳状态
// @Tags 智能体中心-运行与轨迹
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=[]dto.RunHeartbeatRes} "成功"
// @Router /api/agent/run/heartbeats [get]
func (c *RunController) Heartbeats(ctx *gin.Context) {
	res, err := c.runSvc.RecentHeartbeats(middleware.GetDataScope(ctx))
	if err != nil {
		response.FailMessage("获取运行心跳失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// Cancel 手动中断正在运行的 Agent 会话
// @Summary 取消运行中的智能体任务
// @Tags 智能体中心-运行与轨迹
// @Produce json
// @Security Bearer
// @Param id path int true "Run ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/agent/run/cancel/{id} [post]
func (c *RunController) Cancel(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的轨迹 ID", ctx)
		return
	}
	if err := c.runSvc.Cancel(uint(id), middleware.GetDataScope(ctx)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}
