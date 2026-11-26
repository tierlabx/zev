package controller

import (
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

// OpenController 开放接口控制器，包含无需鉴权的公共接口
type OpenController struct{}

func NewOpenController() *OpenController {
	return &OpenController{}
}

// PingHandler
// @Summary Ping
// @Description 测试服务是否正常运行
// @Tags 测试
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/ping [get]
func (c *OpenController) PingHandler(ctx *gin.Context) {
	response.Success(ctx)
}
