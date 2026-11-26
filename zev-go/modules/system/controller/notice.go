package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/noticehub"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type NoticeController struct {
	noticeService *service.NoticeService
}

func NewNoticeController(noticeService *service.NoticeService) *NoticeController {
	return &NoticeController{
		noticeService: noticeService,
	}
}

// Stream 建立当前登录用户的 SSE 实时消息推送连接
// @Summary 建立实时消息推送流 (SSE)
// @Tags 系统管理-消息中心
// @Produce text/event-stream
// @Security Bearer
// @Router /api/system/notice/stream [get]
func (c *NoticeController) Stream(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		response.FailUnauthorized("未授权", ctx)
		return
	}

	flusher, ok := ctx.Writer.(http.Flusher)
	if !ok {
		response.FailMessage("当前响应器不支持流式推送", ctx)
		return
	}

	ctx.Writer.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	ctx.Writer.Header().Set("Cache-Control", "no-cache")
	ctx.Writer.Header().Set("Connection", "keep-alive")
	ctx.Writer.Header().Set("X-Accel-Buffering", "no")

	events, cancel := noticehub.Subscribe(userID)
	defer cancel()

	// 先发送连接就绪握手注释行，立即激活浏览器流读取器
	_, _ = fmt.Fprint(ctx.Writer, ": connected\n\n")
	flusher.Flush()

	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	reqDone := ctx.Request.Context().Done()
	hubDone := noticehub.Done()

	for {
		select {
		case <-reqDone:
			return
		case <-hubDone:
			return
		case <-heartbeat.C:
			if _, err := fmt.Fprint(ctx.Writer, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()
		case evt, chOpen := <-events:
			if !chOpen {
				return
			}
			payload, err := json.Marshal(evt)
			if err != nil {
				continue
			}
			if _, err := fmt.Fprintf(ctx.Writer, "event: notice\ndata: %s\n\n", payload); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

// GetUnreadCount 获取各分类未读消息数量
// @Summary 获取未读消息计数
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=dto.UnreadCountRes} "成功"
// @Router /api/system/notice/unread-count [get]
func (c *NoticeController) GetUnreadCount(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	res, err := c.noticeService.GetUnreadCount(userID)
	if err != nil {
		response.FailMessage("获取未读计数失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// GetUnreadList 获取最近未读通知列表（顶栏铃铛使用）
// @Summary 获取最近未读消息
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param limit query int false "条数限制"
// @Success 200 {object} response.Response{data=[]dto.MyNoticeItem} "成功"
// @Router /api/system/notice/list [get]
func (c *NoticeController) GetUnreadList(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "6"))
	notices, err := c.noticeService.GetUnreadList(userID, limit)
	if err != nil {
		response.FailMessage("获取未读消息失败", ctx)
		return
	}
	response.SuccessData(notices, ctx)
}

// ListMyNotices 分页查询个人收件箱消息
// @Summary 查询个人消息列表
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param query query dto.MyNoticeListReq false "查询条件"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/my [get]
func (c *NoticeController) ListMyNotices(ctx *gin.Context) {
	var req dto.MyNoticeListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误", ctx)
		return
	}
	res, err := c.noticeService.ListMyNotices(ctx.GetUint("userID"), req)
	if err != nil {
		response.FailMessage("获取个人消息失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// GetMyNoticeDetail 获取个人单条消息详情
// @Summary 获取个人消息详情
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response{data=dto.MyNoticeItem} "成功"
// @Router /api/system/notice/my/{id} [get]
func (c *NoticeController) GetMyNoticeDetail(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	res, err := c.noticeService.GetMyNoticeDetail(ctx.GetUint("userID"), uint(id))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// MarkAsRead 标记个人单条消息已读
// @Summary 标记消息已读
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/read/{id} [put]
func (c *NoticeController) MarkAsRead(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	if err := c.noticeService.MarkAsRead(ctx.GetUint("userID"), uint(id)); err != nil {
		response.FailMessage("标记已读失败", ctx)
		return
	}
	response.Success(ctx)
}

// MarkAsUnread 标记个人单条消息未读
// @Summary 标记消息未读
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/unread/{id} [put]
func (c *NoticeController) MarkAsUnread(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	if err := c.noticeService.MarkAsUnread(ctx.GetUint("userID"), uint(id)); err != nil {
		response.FailMessage("标记未读失败", ctx)
		return
	}
	response.Success(ctx)
}

// MarkAllAsRead 全部标为已读
// @Summary 全部消息标为已读
// @Tags 系统管理-消息中心
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.ReadAllNoticeReq false "可选消息类型"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/read-all [put]
func (c *NoticeController) MarkAllAsRead(ctx *gin.Context) {
	var req dto.ReadAllNoticeReq
	if ctx.Request.ContentLength > 0 {
		_ = ctx.ShouldBindJSON(&req)
	}
	if err := c.noticeService.MarkAllAsRead(ctx.GetUint("userID"), req.Type); err != nil {
		response.FailMessage("全部已读操作失败", ctx)
		return
	}
	response.Success(ctx)
}

// DeleteMyNotices 批量从个人收件箱删除消息
// @Summary 批量删除个人消息
// @Tags 系统管理-消息中心
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.BatchNoticeIDsReq true "消息ID列表"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/my/delete [delete]
func (c *NoticeController) DeleteMyNotices(ctx *gin.Context) {
	var req dto.BatchNoticeIDsReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请选择需要删除的消息", ctx)
		return
	}
	if err := c.noticeService.DeleteMyNotices(ctx.GetUint("userID"), req.IDs); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ClearReadNotices 清空个人全部已读消息
// @Summary 清空个人已读消息
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/my/clear-read [delete]
func (c *NoticeController) ClearReadNotices(ctx *gin.Context) {
	if err := c.noticeService.ClearReadNotices(ctx.GetUint("userID")); err != nil {
		response.FailMessage("清空已读失败: "+err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ListReceivers 获取站内接收人候选项列表
// @Summary 获取站内消息接收人选项
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param keyword query string false "关键词"
// @Success 200 {object} response.Response{data=[]dto.ReceiverOption} "成功"
// @Router /api/system/notice/receivers [get]
func (c *NoticeController) ListReceivers(ctx *gin.Context) {
	options, err := c.noticeService.ListReceiverOptions(middleware.GetDataScope(ctx), ctx.Query("keyword"))
	if err != nil {
		response.FailMessage("获取接收人列表失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(options, ctx)
}

// SendDirectMessage 发送站内私信
// @Summary 发送站内私信
// @Tags 系统管理-消息中心
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.SendDirectMessageReq true "私信内容"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/direct [post]
func (c *NoticeController) SendDirectMessage(ctx *gin.Context) {
	var req dto.SendDirectMessageReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("私信参数错误: "+err.Error(), ctx)
		return
	}
	notice, err := c.noticeService.SendDirectMessage(
		middleware.GetDataScope(ctx),
		ctx.GetUint("userID"),
		ctx.GetString("username"),
		req,
	)
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(notice, ctx)
}

// ListSentNotices 分页查询当前登录用户已发送的消息记录
// @Summary 查询已发送消息列表
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param query query dto.SentNoticeListReq false "查询条件"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/sent [get]
func (c *NoticeController) ListSentNotices(ctx *gin.Context) {
	var req dto.SentNoticeListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误", ctx)
		return
	}
	res, err := c.noticeService.ListSentNotices(ctx.GetUint("userID"), req)
	if err != nil {
		response.FailMessage("获取已发送消息失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// GetSentNoticeDetail 获取当前用户已发送单条消息详情及接收人阅读状态
// @Summary 获取已发送消息详情
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response{data=dto.SentNoticeItem} "成功"
// @Router /api/system/notice/sent/{id} [get]
func (c *NoticeController) GetSentNoticeDetail(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	res, err := c.noticeService.GetSentNoticeDetail(ctx.GetUint("userID"), uint(id))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// RevokeMyDirectMessage 发件人撤回自己发送的站内私信
// @Summary 撤回个人发送的站内私信
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/sent/revoke/{id} [post]
func (c *NoticeController) RevokeMyDirectMessage(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	if err := c.noticeService.RevokeMyDirectMessage(ctx.GetUint("userID"), uint(id)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// ListManageNotices 管理端分页查询消息列表
// @Summary 分页查询管理端消息
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param query query dto.ManageNoticeListReq false "筛选参数"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/manage/list [get]
func (c *NoticeController) ListManageNotices(ctx *gin.Context) {
	var req dto.ManageNoticeListReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		response.FailMessage("查询参数错误", ctx)
		return
	}
	res, err := c.noticeService.ListManageNotices(middleware.GetDataScope(ctx), req)
	if err != nil {
		response.FailMessage("获取消息管理列表失败: "+err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// GetManageNotice 获取管理端单条消息详情
// @Summary 获取管理端消息详情
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response{data=dto.ManageNoticeItem} "成功"
// @Router /api/system/notice/manage/get/{id} [get]
func (c *NoticeController) GetManageNotice(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	res, err := c.noticeService.GetManageNotice(middleware.GetDataScope(ctx), uint(id))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// CreateNotice 管理端创建消息（支持草稿或直接发布）
// @Summary 创建消息公告
// @Tags 系统管理-消息中心
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.CreateNoticeReq true "消息详情"
// @Success 200 {object} response.Response{data=dto.ManageNoticeItem} "成功"
// @Router /api/system/notice/create [post]
func (c *NoticeController) CreateNotice(ctx *gin.Context) {
	var req dto.CreateNoticeReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("消息参数错误: "+err.Error(), ctx)
		return
	}
	res, err := c.noticeService.CreateNotice(
		middleware.GetDataScope(ctx),
		ctx.GetUint("userID"),
		ctx.GetString("username"),
		req,
	)
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(res, ctx)
}

// UpdateNotice 管理端编辑消息
// @Summary 编辑消息公告
// @Tags 系统管理-消息中心
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.UpdateNoticeReq true "消息修改内容"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/update [put]
func (c *NoticeController) UpdateNotice(ctx *gin.Context) {
	var req dto.UpdateNoticeReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("消息参数错误: "+err.Error(), ctx)
		return
	}
	if err := c.noticeService.UpdateNotice(middleware.GetDataScope(ctx), req); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// PublishNotice 发布草稿或已撤回消息
// @Summary 发布消息公告
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/publish/{id} [post]
func (c *NoticeController) PublishNotice(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	if err := c.noticeService.PublishNotice(middleware.GetDataScope(ctx), uint(id)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// RevokeNotice 撤回已发布消息
// @Summary 撤回消息公告
// @Tags 系统管理-消息中心
// @Produce json
// @Security Bearer
// @Param id path int true "消息ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/revoke/{id} [post]
func (c *NoticeController) RevokeNotice(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.FailMessage("无效的消息ID", ctx)
		return
	}
	if err := c.noticeService.RevokeNotice(middleware.GetDataScope(ctx), uint(id)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// DeleteNotices 管理端批量删除消息
// @Summary 批量删除消息公告
// @Tags 系统管理-消息中心
// @Accept json
// @Produce json
// @Security Bearer
// @Param req body dto.BatchNoticeIDsReq true "消息ID列表"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/delete [delete]
func (c *NoticeController) DeleteNotices(ctx *gin.Context) {
	var req dto.BatchNoticeIDsReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请选择需要删除的消息", ctx)
		return
	}
	if err := c.noticeService.DeleteNotices(middleware.GetDataScope(ctx), req.IDs); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}
