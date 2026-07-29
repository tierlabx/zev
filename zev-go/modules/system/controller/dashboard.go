package controller

import (
	"zev-go/modules/system/service"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type DashboardController struct {
	dashboardService *service.DashboardService
}

func NewDashboardController(dashboardService *service.DashboardService) *DashboardController {
	return &DashboardController{
		dashboardService: dashboardService,
	}
}

// GetStats 获取仪表盘统计数据
// @Summary 获取仪表盘统计数据
// @Description 获取用户、角色、菜单等数量，近期趋势和最新活动记录
// @Tags 系统管理-仪表盘
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=dto.DashboardRes} "成功"
// @Router /api/system/dashboard/stats [get]
func (c *DashboardController) GetStats(ctx *gin.Context) {
	data, err := c.dashboardService.GetDashboardData()
	if err != nil {
		response.FailMessage("获取仪表盘数据失败", ctx)
		return
	}
	response.SuccessData(data, ctx)
}
