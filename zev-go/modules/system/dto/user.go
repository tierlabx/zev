package dto

type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRes struct {
	Token    string `json:"token"`
	Nickname string `json:"nickname"`
	RoleID   uint   `json:"role_id"`
}
