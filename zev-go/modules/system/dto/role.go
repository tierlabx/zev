package dto

// AssignRoleMenusReq 为角色分配菜单权限请求
type AssignRoleMenusReq struct {
	MenuIDs []uint `json:"menu_ids"`
}

// RoleCreateUpdateReq 新增或编辑角色请求参数
type RoleCreateUpdateReq struct {
	ID        uint   `json:"ID"`
	Name      string `json:"name" binding:"required,min=2,max=50"`
	Code      string `json:"code" binding:"required,min=2,max=50"`
	Status    int    `json:"status"`
	Sort      int    `json:"sort"`
	Desc      string `json:"desc"`
	DataScope int    `json:"data_scope"`
}

// AssignRoleDataScopeReq 为角色配置数据权限范围与自定义部门列表请求
type AssignRoleDataScopeReq struct {
	DataScope int    `json:"data_scope" binding:"required"`
	DeptIDs   []uint `json:"dept_ids"`
}

// RoleDataScopeRes 角色已配置的数据权限范围与关联部门列表响应
type RoleDataScopeRes struct {
	RoleID    uint   `json:"role_id"`
	DataScope int    `json:"data_scope"`
	DeptIDs   []uint `json:"dept_ids"`
}
