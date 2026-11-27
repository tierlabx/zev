package dto

import "zev-go/modules/system/entity"

type MenuTreeRes struct {
	entity.Menu
	Children []MenuTreeRes `json:"children"`
}

// PermTreeNode 权限标识级联树节点（按冒号分段构建）
type PermTreeNode struct {
	Value    string         `json:"value"`
	Key      string         `json:"key,omitempty"`
	Children []PermTreeNode `json:"children,omitempty"`
}
