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
