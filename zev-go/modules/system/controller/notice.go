package controller

import (
	"strconv"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type NoticeController struct {
	*crud.BaseController[service.NoticeService]
	noticeService *service.NoticeService
}

func NewNoticeController(noticeService *service.NoticeService) *NoticeController {
	return &NoticeController{
		noticeService: noticeService,
	}
}

// GetUnreadList 获取未读通知
// @Summary 获取未读通知
// @Description 获取当前登录用户的未读通知列表
// @Tags 系统管理-通知管理
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=[]entity.SysNotice} "成功"
// @Router /api/system/notice/list [get]
func (c *NoticeController) GetUnreadList(ctx *gin.Context) {
	username := ctx.GetString("username")
	if username == "" {
		response.FailMessage("未授权", ctx)
		return
	}
	
	notices, err := c.noticeService.GetUnreadList(username)
	if err != nil {
		response.FailMessage("获取失败", ctx)
		return
	}
	response.SuccessData(notices, ctx)
}

// MarkAsRead 标记已读
// @Summary 标记通知已读
// @Description 将指定通知标记为已读
// @Tags 系统管理-通知管理
// @Produce json
// @Security Bearer
// @Param id path int true "通知ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/notice/read/{id} [put]
func (c *NoticeController) MarkAsRead(ctx *gin.Context) {
	username := ctx.GetString("username")
	if username == "" {
		response.FailMessage("未授权", ctx)
		return
	}
	idStr := ctx.Param("id")
	id, _ := strconv.Atoi(idStr)

	if err := c.noticeService.MarkAsRead(uint(id), username); err != nil {
		response.FailMessage("操作失败", ctx)
		return
	}
	response.Success(ctx)
}
