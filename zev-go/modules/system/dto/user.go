package dto

type LoginReq struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required"`
	CaptchaID   string `json:"captcha_id" binding:"required"`
	CaptchaCode string `json:"captcha_code" binding:"required"`
}

// CaptchaRes 登录图形验证码响应
type CaptchaRes struct {
	CaptchaID   string `json:"captcha_id"`
	CaptchaImg  string `json:"captcha_img"`
	ExpireAfter int    `json:"expire_after"`
}

// ClientMeta 客户端请求环境元信息，用于安全登录与审计日志
type ClientMeta struct {
	IP        string `json:"-"`
	UserAgent string `json:"-"`
	Browser   string `json:"-"`
	OS        string `json:"-"`
	RequestID string `json:"-"`
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
	DeptID   uint   `json:"dept_id"`
	RoleID   uint   `json:"role_id"`
	RoleIDs  []uint `json:"role_ids"`
	Status   int    `json:"status"`
}

// AssignUserRoleReq 为用户分配单个或多个角色请求（保留 RoleID 以兼容旧调用方）
type AssignUserRoleReq struct {
	RoleID  uint   `json:"role_id"`
	RoleIDs []uint `json:"role_ids"`
}

// UserInfoRes 当前登录用户信息响应
type UserInfoRes struct {
	ID          uint     `json:"id"`
	Username    string   `json:"username"`
	Nickname    string   `json:"nickname"`
	Avatar      string   `json:"avatar"`
	Email       string   `json:"email"`
	DeptID      uint     `json:"dept_id"`
	DeptName    string   `json:"dept_name"`
	RoleID      uint     `json:"role_id"`
	RoleIDs     []uint   `json:"role_ids"`
	Roles       []string `json:"roles"`
	RoleName    string   `json:"role_name"`
	RoleCode    string   `json:"role_code"`
	DataScope   int      `json:"data_scope"`
	Permissions []string `json:"permissions"`
	Menus       []any    `json:"menus"`
}

// UpdateProfileReq 当前登录用户自助更新个人资料请求
type UpdateProfileReq struct {
	Nickname string `json:"nickname" binding:"required,min=2,max=50"`
	Email    string `json:"email" binding:"omitempty,email,max=100"`
	Avatar   string `json:"avatar" binding:"omitempty,max=255"`
}

// ChangePasswordReq 当前登录用户修改密码请求
type ChangePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=64"`
}
