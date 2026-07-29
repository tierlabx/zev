package dto

type AssignRoleMenusReq struct {
	MenuIDs []uint `json:"menu_ids"`
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
