package service

import (
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"

	"gorm.io/gorm"
)

type RoleService struct {
	*crud.BaseService[entity.Role]
}

func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{
		BaseService: crud.NewBaseService[entity.Role](db),
	}
}

func (s *RoleService) AssignMenus(roleID uint, menuIDs []uint) error {
	var role entity.Role
	if err := s.DB.First(&role, roleID).Error; err != nil {
		return err
	}

	var menus []entity.Menu
	if len(menuIDs) > 0 {
		if err := s.DB.Where("id IN ?", menuIDs).Find(&menus).Error; err != nil {
			return err
		}
	}

	return s.DB.Model(&role).Association("Menus").Replace(menus)
}

func (s *RoleService) GetRoleMenuIDs(roleID uint) ([]uint, error) {
	var role entity.Role
	if err := s.DB.Preload("Menus").First(&role, roleID).Error; err != nil {
		return nil, err
	}
	var menuIDs []uint
	for _, m := range role.Menus {
		menuIDs = append(menuIDs, m.ID)
	}
	return menuIDs, nil
}

// GetRolePerms 获取角色的所有权限标识列表（包括按钮级权限）
// admin (roleID=1) 直接返回 "*" 表示拥有所有权限
func (s *RoleService) GetRolePerms(roleID uint) ([]string, error) {
	if roleID == 1 {
		return []string{"*"}, nil
	}

	var role entity.Role
	if err := s.DB.Preload("Menus").First(&role, roleID).Error; err != nil {
		return nil, err
	}

	permsSet := make(map[string]bool)
	for _, m := range role.Menus {
		if m.Perms != "" {
			permsSet[m.Perms] = true
		}
	}

	perms := make([]string, 0, len(permsSet))
	for p := range permsSet {
		perms = append(perms, p)
	}
	return perms, nil
}
