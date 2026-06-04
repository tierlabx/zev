package dto

type AssignRoleMenusReq struct {
	MenuIDs []uint `json:"menu_ids"`
}

type AssignUserRoleReq struct {
	RoleID uint `json:"role_id" binding:"required"`
}
