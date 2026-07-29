package controller

import (
	"strconv"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type UserController struct {
	*crud.BaseController[entity.User]
	userService *service.UserService
	roleService *service.RoleService
	menuService *service.MenuService
}

func NewUserController(userService *service.UserService, roleService *service.RoleService, menuService *service.MenuService) *UserController {
	return &UserController{
		BaseController: crud.NewBaseController[entity.User](userService.BaseService),
		userService:    userService,
		roleService:    roleService,
		menuService:    menuService,
	}
}

type UserCreateUpdateReq struct {
	ID       uint   `json:"ID"`
	Username string `json:"username"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
	RoleID   uint   `json:"role_id"`
	Status   int    `json:"status"`
}

// Create 重写创建用户，支持密码加密
// @Summary 创建用户
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param req body UserCreateUpdateReq true "用户信息"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/user/create [post]
func (c *UserController) Create(ctx *gin.Context) {
	var req UserCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	user := entity.User{
		Username: req.Username,
		Nickname: req.Nickname,
		Email:    req.Email,
		Avatar:   req.Avatar,
		RoleID:   req.RoleID,
		Status:   req.Status,
	}

	if req.Password != "" {
		hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		user.Password = string(hashed)
	}

	if err := c.userService.Create(&user); err != nil {
		response.FailMessage("创建失败", ctx)
		return
	}
	response.SuccessData(user, ctx)
}

// Update 重写更新用户，支持密码不修改
// @Summary 更新用户
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param req body UserCreateUpdateReq true "用户信息"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/user/update [put]
func (c *UserController) Update(ctx *gin.Context) {
	var req UserCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	existingUser, err := c.userService.GetByID(req.ID)
	if err != nil {
		response.FailMessage("用户不存在", ctx)
		return
	}

	existingUser.Username = req.Username
	existingUser.Nickname = req.Nickname
	existingUser.Email = req.Email
	existingUser.Avatar = req.Avatar
	existingUser.RoleID = req.RoleID
	existingUser.Status = req.Status

	if req.Password != "" {
		hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		existingUser.Password = string(hashed)
	}

	if err := c.userService.Update(existingUser); err != nil {
		response.FailMessage("更新失败", ctx)
		return
	}
	response.Success(ctx)
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
// @Security Bearer
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
// @Security Bearer
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

// UserInfo 获取当前登录用户信息（含角色、权限、菜单树）
// @Summary 获取当前用户信息
// @Description 获取当前登录用户的个人信息、角色、权限标识和菜单树
// @Tags 系统管理-用户
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=dto.UserInfoRes} "成功"
// @Router /api/system/user/info [get]
func (c *UserController) UserInfo(ctx *gin.Context) {
	userIDAny, exists := ctx.Get("userID")
	if !exists {
		response.FailUnauthorized("无法获取用户信息", ctx)
		return
	}

	userID, ok := userIDAny.(uint)
	if !ok {
		response.FailMessage("用户ID格式错误", ctx)
		return
	}

	user, err := c.userService.GetByID(userID)
	if err != nil {
		response.FailMessage("用户不存在", ctx)
		return
	}

	// 查询角色信息
	var role entity.Role
	roleName := ""
	roleCode := ""
	if err := c.roleService.DB.First(&role, user.RoleID).Error; err == nil {
		roleName = role.Name
		roleCode = role.Code
	}

	// 获取权限标识列表
	perms, _ := c.roleService.GetRolePerms(user.RoleID)

	// 获取菜单树
	menuTree, _ := c.menuService.GetMenuTreeByRole(user.RoleID)

	res := dto.UserInfoRes{
		ID:          user.ID,
		Username:    user.Username,
		Nickname:    user.Nickname,
		Avatar:      user.Avatar,
		Email:       user.Email,
		RoleID:      user.RoleID,
		RoleName:    roleName,
		RoleCode:    roleCode,
		Permissions: perms,
		Menus: func() []any {
			if menuTree == nil {
				return []any{}
			}
			result := make([]any, len(menuTree))
			for i, m := range menuTree {
				result[i] = m
			}
			return result
		}(),
	}

	response.SuccessData(res, ctx)
}
