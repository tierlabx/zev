package service

import (
	"slices"
	"strings"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"
	"zev-go/pkg/perm"

	"gorm.io/gorm"
)

type MenuService struct {
	*crud.BaseService[entity.Menu]
}

func NewMenuService(db *gorm.DB) *MenuService {
	return &MenuService{
		BaseService: crud.NewBaseService[entity.Menu](db),
	}
}

// GetMenuTree 获取树形菜单结构
func (s *MenuService) GetMenuTree() ([]dto.MenuTreeRes, error) {
	var menus []entity.Menu
	err := s.DB.Order("sort asc, id asc").Find(&menus).Error
	if err != nil {
		return nil, err
	}

	return buildMenuTree(menus, 0), nil
}

// GetMenuTreeByRole 获取单个指定角色的菜单树
func (s *MenuService) GetMenuTreeByRole(roleID uint) ([]dto.MenuTreeRes, error) {
	return s.GetMenuTreeByRoles([]uint{roleID})
}

// GetMenuTreeByRoles 合并多个启用角色下的可见菜单树（仅目录和菜单，不含按钮）
func (s *MenuService) GetMenuTreeByRoles(roleIDs []uint) ([]dto.MenuTreeRes, error) {
	if len(roleIDs) == 0 {
		return []dto.MenuTreeRes{}, nil
	}

	var activeRoles []entity.Role
	if err := s.DB.Select("id, code").Where("id IN ? AND status = 0", roleIDs).Find(&activeRoles).Error; err != nil {
		return nil, err
	}
	if len(activeRoles) == 0 {
		return []dto.MenuTreeRes{}, nil
	}

	activeIDs := make([]uint, 0, len(activeRoles))
	for _, r := range activeRoles {
		if datascope.IsSuperAdminRole(r.ID, r.Code) {
			return s.GetMenuTree()
		}
		activeIDs = append(activeIDs, r.ID)
	}

	var menus []entity.Menu
	err := s.DB.
		Distinct("menus.*").
		Joins("JOIN sys_role_menus ON sys_role_menus.menu_id = menus.id").
		Where("sys_role_menus.role_id IN ? AND menus.type IN (?, ?) AND menus.deleted_at IS NULL", activeIDs, "M", "C").
		Order("menus.sort asc, menus.id asc").
		Find(&menus).Error
	if err != nil {
		return nil, err
	}

	tree := buildMenuTree(menus, 0)
	if tree == nil {
		return []dto.MenuTreeRes{}, nil
	}
	return tree, nil
}

// 辅助函数，递归构建树形结构
func buildMenuTree(menus []entity.Menu, parentID uint) []dto.MenuTreeRes {
	var tree []dto.MenuTreeRes
	for _, m := range menus {
		if m.ParentID == parentID {
			node := dto.MenuTreeRes{
				Menu:     m,
				Children: buildMenuTree(menus, m.ID),
			}
			if node.Children == nil {
				node.Children = make([]dto.MenuTreeRes, 0)
			}
			tree = append(tree, node)
		}
	}
	return tree
}

// GetPermissionTree 合并路由自动注册权限与存量菜单权限，按冒号分段生成级联选项树
func (s *MenuService) GetPermissionTree() ([]dto.PermTreeNode, error) {
	merged := make(map[string]struct{})
	for _, p := range perm.Registered() {
		merged[p] = struct{}{}
	}

	var dbPerms []string
	if err := s.DB.Model(&entity.Menu{}).Where("perms <> ''").Pluck("perms", &dbPerms).Error; err != nil {
		return nil, err
	}
	for _, raw := range dbPerms {
		for _, p := range perm.Split(raw) {
			merged[p] = struct{}{}
		}
	}

	all := make([]string, 0, len(merged))
	for p := range merged {
		all = append(all, p)
	}
	return BuildPermTree(all), nil
}

type permTrieNode struct {
	value    string
	key      string
	children map[string]*permTrieNode
}

// BuildPermTree 将扁平冒号分隔权限列表装配为排序后的多级树结构
func BuildPermTree(perms []string) []dto.PermTreeNode {
	root := &permTrieNode{children: make(map[string]*permTrieNode)}
	for _, raw := range perms {
		for _, p := range perm.Split(raw) {
			segments := strings.Split(p, ":")
			curr := root
			for _, seg := range segments {
				if seg == "" {
					continue
				}
				next, exists := curr.children[seg]
				if !exists {
					next = &permTrieNode{
						value:    seg,
						children: make(map[string]*permTrieNode),
					}
					curr.children[seg] = next
				}
				curr = next
			}
			if curr != root {
				curr.key = p
			}
		}
	}
	return flattenPermTrie(root.children)
}

func flattenPermTrie(nodes map[string]*permTrieNode) []dto.PermTreeNode {
	if len(nodes) == 0 {
		return nil
	}
	out := make([]dto.PermTreeNode, 0, len(nodes))
	for _, n := range nodes {
		out = append(out, dto.PermTreeNode{
			Value:    n.value,
			Key:      n.key,
			Children: flattenPermTrie(n.children),
		})
	}
	slices.SortFunc(out, func(a, b dto.PermTreeNode) int {
		return strings.Compare(a.Value, b.Value)
	})
	return out
}
