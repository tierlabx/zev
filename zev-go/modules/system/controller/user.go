package controller

import (
	"strconv"

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
// @Success 200 {object} response.Response{data=dto.LoginRes} "成功"
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

// Logout 用户退出登录
// @Summary 用户退出登录
// @Description 退出登录
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Success 200 {object} response.Response "成功"
// @Router /api/system/logout [post]
func (c *UserController) Logout(ctx *gin.Context) {
	// 简单的 JWT 无状态退出，后端直接返回成功，前端清理本地 Token 即可
	// 若需要强制失效，可在此处结合 Redis 实现 Token 黑名单
	response.Success(ctx)
}

// AssignRole 分配角色
// @Summary 分配角色
// @Description 给用户分配角色
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Param req body dto.AssignUserRoleReq true "角色ID"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/user/role/{id} [post]
func (c *UserController) AssignRole(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, _ := strconv.Atoi(idStr)

	var req dto.AssignUserRoleReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请求参数错误", ctx)
		return
	}

	if err := c.userService.AssignRole(uint(id), req.RoleID); err != nil {
		response.FailMessage("分配角色失败", ctx)
		return
	}

	response.Success(ctx)
}
