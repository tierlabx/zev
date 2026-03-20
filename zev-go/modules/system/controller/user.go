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
