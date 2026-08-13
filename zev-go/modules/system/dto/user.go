package dto

type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRes struct {
	Token    string `json:"token"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	RoleID   uint   `json:"role_id"`
	RoleName string `json:"role_name"`
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

type AssignUserRoleReq struct {
	RoleID uint `json:"role_id" binding:"required"`
}

// UserInfoRes 当前登录用户信息响应
type UserInfoRes struct {
	ID          uint     `json:"id"`
	Username    string   `json:"username"`
	Nickname    string   `json:"nickname"`
	Avatar      string   `json:"avatar"`
	Email       string   `json:"email"`
	RoleID      uint     `json:"role_id"`
	RoleName    string   `json:"role_name"`
	RoleCode    string   `json:"role_code"`
	Permissions []string `json:"permissions"`
	Menus       []any    `json:"menus"`
}

