package controller

import (
	"strconv"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/logger"
	"zev-go/pkg/middleware"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
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

// Create 重写创建用户，支持密码加密
// @Summary 创建用户
// @Tags 系统管理-用户
// @Accept json
// @Produce json
func (c *UserController) Create(ctx *gin.Context) {
	var req dto.UserCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	if err := c.userService.CreateUser(middleware.GetDataScope(ctx), req); err != nil {
		response.FailMessage("创建失败: "+err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Update 重写更新用户，支持密码不修改
// @Summary 更新用户
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param req body dto.UserCreateUpdateReq true "用户信息"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/user/update [put]
func (c *UserController) Update(ctx *gin.Context) {
	var req dto.UserCreateUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}

	if err := c.userService.UpdateUser(middleware.GetDataScope(ctx), req); err != nil {
		response.FailMessage("更新失败: "+err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Delete 删除用户（校验数据权限与超管保护）
// @Summary 删除用户
// @Tags 系统管理-用户
// @Produce json
// @Param id path int true "用户ID"
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/user/delete/{id} [delete]
func (c *UserController) Delete(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的用户ID", ctx)
		return
	}

	if err := c.userService.DeleteUser(middleware.GetDataScope(ctx), uint(id)); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.Success(ctx)
}

// Get 获取单条用户详情（校验数据权限）
// @Summary 获取用户详情
// @Tags 系统管理-用户
// @Produce json
// @Param id path int true "用户ID"
// @Security Bearer
// @Success 200 {object} response.Response{data=entity.User} "成功"
// @Router /api/system/user/get/{id} [get]
func (c *UserController) Get(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的用户ID", ctx)
		return
	}

	user, err := c.userService.GetUserByID(middleware.GetDataScope(ctx), uint(id))
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}
	response.SuccessData(user, ctx)
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

	ua := ctx.Request.UserAgent()
	browser, osName := logger.ParseUserAgent(ua)
	meta := dto.ClientMeta{
		IP:        ctx.ClientIP(),
		UserAgent: logger.TruncateString(ua, 500),
		Browser:   browser,
		OS:        osName,
		RequestID: middleware.GetRequestID(ctx),
	}

	res, err := c.userService.Login(req, meta)
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
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		response.FailMessage("无效的用户ID", ctx)
		return
	}

	var req dto.AssignUserRoleReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请求参数错误", ctx)
		return
	}

	roleIDs := req.RoleIDs
	if len(roleIDs) == 0 && req.RoleID > 0 {
		roleIDs = []uint{req.RoleID}
	}

	if err := c.userService.AssignRoles(middleware.GetDataScope(ctx), uint(id), roleIDs); err != nil {
		response.FailMessage("分配角色失败: "+err.Error(), ctx)
		return
	}

	response.Success(ctx)
}

func getCurrentUserID(ctx *gin.Context) (uint, bool) {
	userIDAny, exists := ctx.Get("userID")
	if !exists {
		response.FailUnauthorized("无法获取用户信息", ctx)
		return 0, false
	}

	userID, ok := userIDAny.(uint)
	if !ok {
		response.FailMessage("用户ID格式错误", ctx)
		return 0, false
	}
	return userID, true
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
	userID, ok := getCurrentUserID(ctx)
	if !ok {
		return
	}

	res, err := c.userService.GetUserInfo(userID)
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}

	response.SuccessData(res, ctx)
}

// UpdateProfile 更新当前登录用户的个人资料
// @Summary 更新个人资料
// @Description 当前登录用户自助修改昵称、邮箱与头像
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param req body dto.UpdateProfileReq true "个人资料"
// @Security Bearer
// @Success 200 {object} response.Response{data=dto.UserInfoRes} "成功"
// @Router /api/system/user/profile [put]
func (c *UserController) UpdateProfile(ctx *gin.Context) {
	userID, ok := getCurrentUserID(ctx)
	if !ok {
		return
	}

	var req dto.UpdateProfileReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请求参数格式有误，请检查昵称与邮箱格式", ctx)
		return
	}

	res, err := c.userService.UpdateProfile(userID, req)
	if err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}

	response.SuccessData(res, ctx)
}

// ChangePassword 修改当前登录用户密码
// @Summary 修改个人密码
// @Description 校验当前密码后更新为新密码
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param req body dto.ChangePasswordReq true "密码修改信息"
// @Security Bearer
// @Success 200 {object} response.Response "成功"
// @Router /api/system/user/password [put]
func (c *UserController) ChangePassword(ctx *gin.Context) {
	userID, ok := getCurrentUserID(ctx)
	if !ok {
		return
	}

	var req dto.ChangePasswordReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		response.FailMessage("请求参数格式有误，新密码长度需在 6 到 64 位之间", ctx)
		return
	}

	if err := c.userService.ChangePassword(userID, req); err != nil {
		response.FailMessage(err.Error(), ctx)
		return
	}

	response.Success(ctx)
}

// List 重写获取用户列表，支持 keyword、deptId、status 搜索并自动应用数据范围过滤
// @Summary 获取用户列表
// @Description 获取分页用户列表，支持按关键词、部门子树与状态筛选，受角色数据权限约束
// @Tags 系统管理-用户
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param keyword query string false "搜索关键词"
// @Param deptId query int false "部门ID"
// @Param status query int false "状态(0正常 1禁用)"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/user/list [get]
func (c *UserController) List(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("pageSize", "10"))
	keyword := ctx.Query("keyword")
	deptID, _ := strconv.Atoi(ctx.DefaultQuery("deptId", "0"))
	var statusPtr *int
	if statusStr := ctx.Query("status"); statusStr != "" {
		if sVal, err := strconv.Atoi(statusStr); err == nil {
			statusPtr = &sVal
		}
	}

	list, total, err := c.userService.ListWithFilter(middleware.GetDataScope(ctx), page, pageSize, keyword, uint(deptID), statusPtr)
	if err != nil {
		response.FailMessage("获取列表失败", ctx)
		return
	}

	response.SuccessData(map[string]interface{}{
		"list":  list,
		"total": total,
	}, ctx)
}
