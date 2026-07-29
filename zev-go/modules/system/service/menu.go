package service

import (
	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"

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

// GetMenuTreeByRole 获取指定角色的菜单树（仅目录和菜单，不含按钮）
// admin (roleID=1) 直接返回全部菜单
func (s *MenuService) GetMenuTreeByRole(roleID uint) ([]dto.MenuTreeRes, error) {
	if roleID == 1 {
		return s.GetMenuTree()
	}

	var menus []entity.Menu
	err := s.DB.
		Joins("JOIN sys_role_menus ON sys_role_menus.menu_id = menus.id").
		Where("sys_role_menus.role_id = ? AND menus.type IN (?, ?)", roleID, "M", "C").
		Order("menus.sort asc, menus.id asc").
		Find(&menus).Error
	if err != nil {
		return nil, err
	}

	return buildMenuTree(menus, 0), nil
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
