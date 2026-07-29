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
