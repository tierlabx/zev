package dto

import "zev-go/modules/system/entity"

// DeptCreateUpdateReq 新增或编辑部门请求参数
type DeptCreateUpdateReq struct {
	ID       uint   `json:"ID"`
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required,min=1,max=50"`
	Code     string `json:"code" binding:"required,min=1,max=50"`
	Leader   string `json:"leader" binding:"omitempty,max=50"`
	Phone    string `json:"phone" binding:"omitempty,max=20"`
	Email    string `json:"email" binding:"omitempty,email,max=100"`
	Sort     int    `json:"sort"`
	Status   int    `json:"status"`
}

// DeptTreeRes 部门树节点响应结构
type DeptTreeRes struct {
	entity.Dept
	Children []DeptTreeRes `json:"children"`
}
