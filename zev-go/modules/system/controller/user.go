package controller

import (
	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	*crud.BaseController[entity.User]
	userService *service.UserService
}

func NewUserController(userService *service.UserService) *UserController {
	return &UserController{
		BaseController: crud.NewBaseController[entity.User](userService.BaseService),
		userService:    userService,
	}
}

// Login 用户登录
// @Summary 用户登录
// @Description 使用账号密码登录
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param req body dto.LoginReq true "登录信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/system/login [post]
func (c *UserController) Login(ctx *gin.Context) {
	var req dto.LoginReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请求参数错误", ctx)
		return
	}

	res, err := c.userService.Login(req)
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}

	response.SuccessData(res, ctx)
}
