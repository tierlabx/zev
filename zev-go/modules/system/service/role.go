package service

import (
	"errors"
	"slices"
	"strings"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"

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

// CreateRole 创建角色，校验编码唯一性及默认数据权限范围
func (s *RoleService) CreateRole(scope *datascope.Scope, req dto.RoleCreateUpdateReq) error {
	name := strings.TrimSpace(req.Name)
	code := strings.TrimSpace(req.Code)
	if name == "" || code == "" {
		return errors.New("角色名称和编码不能为空")
	}

	if datascope.IsSuperAdminRole(0, code) && (scope == nil || !scope.IsSuperAdmin) {
		return errors.New("无权创建超级管理员角色")
	}

	var dupCount int64
	if err := s.DB.Model(&entity.Role{}).Where("code = ?", code).Count(&dupCount).Error; err != nil {
		return err
	}
	if dupCount > 0 {
		return errors.New("角色编码已存在")
	}

	ds := req.DataScope
	if !datascope.IsValidScope(ds) {
		ds = datascope.ScopeSelf
	}
	if ds == datascope.ScopeAll && (scope == nil || (!scope.IsSuperAdmin && !scope.AllData)) {
		return errors.New("无权创建全部数据权限角色")
	}

	role := entity.Role{
		Name:      name,
		Code:      code,
		Status:    req.Status,
		Sort:      req.Sort,
		Desc:      strings.TrimSpace(req.Desc),
		DataScope: ds,
	}
	return s.Create(&role)
}

// UpdateRole 更新角色基础属性（显式字段更新，不覆盖 Menus / Depts 关联）
func (s *RoleService) UpdateRole(scope *datascope.Scope, req dto.RoleCreateUpdateReq) error {
	if req.ID == 0 {
		return errors.New("角色ID不能为空")
	}

	existing, err := s.GetByID(req.ID)
	if err != nil {
		return errors.New("角色不存在")
	}

	isSuperRole := datascope.IsSuperAdminRole(existing.ID, existing.Code)
	if isSuperRole && (scope == nil || !scope.IsSuperAdmin) {
		return errors.New("无权修改超级管理员角色")
	}

	name := strings.TrimSpace(req.Name)
	code := strings.TrimSpace(req.Code)
	if name == "" || code == "" {
		return errors.New("角色名称和编码不能为空")
	}

	if isSuperRole {
		if req.Status == 1 {
			return errors.New("禁止停用超级管理员角色")
		}
		if code != existing.Code {
			return errors.New("禁止修改超级管理员角色编码")
		}
	} else if datascope.IsSuperAdminRole(0, code) && (scope == nil || !scope.IsSuperAdmin) {
		return errors.New("无权将角色编码修改为超级管理员")
	}

	var dupCount int64
	if err := s.DB.Model(&entity.Role{}).Where("code = ? AND id <> ?", code, existing.ID).Count(&dupCount).Error; err != nil {
		return err
	}
	if dupCount > 0 {
		return errors.New("角色编码已存在")
	}

	updates := map[string]any{
		"name":   name,
		"code":   code,
		"status": req.Status,
		"sort":   req.Sort,
		"desc":   strings.TrimSpace(req.Desc),
	}
	if !isSuperRole && datascope.IsValidScope(req.DataScope) {
		if req.DataScope == datascope.ScopeAll && (scope == nil || (!scope.IsSuperAdmin && !scope.AllData)) {
			return errors.New("无权设置全部数据权限")
		}
		updates["data_scope"] = req.DataScope
	}

	return s.DB.Model(&entity.Role{}).Where("id = ?", existing.ID).Updates(updates).Error
}

// DeleteRole 删除角色；保护超管角色并校验用户绑定关系，同时清理菜单与部门关联表
func (s *RoleService) DeleteRole(scope *datascope.Scope, id uint) error {
	if id == 0 {
		return errors.New("角色ID不能为空")
	}

	role, err := s.GetByID(id)
	if err != nil {
		return errors.New("角色不存在")
	}
	if datascope.IsSuperAdminRole(role.ID, role.Code) {
		return errors.New("禁止删除超级管理员角色")
	}
	if scope == nil || (!scope.IsSuperAdmin && !scope.AllData) {
		return errors.New("仅全局数据权限管理员可删除角色")
	}

	var boundCount int64
	err = s.DB.Table("users").
		Where("deleted_at IS NULL AND (role_id = ? OR id IN (SELECT user_id FROM sys_user_roles WHERE role_id = ?))", id, id).
		Count(&boundCount).Error
	if err != nil {
		return err
	}
	if boundCount > 0 {
		return errors.New("该角色已分配给用户，请先解除绑定后再删除")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(role).Association("Menus").Clear(); err != nil {
			return err
		}
		if err := tx.Model(role).Association("Depts").Clear(); err != nil {
			return err
		}
		return tx.Delete(&entity.Role{}, id).Error
	})
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
	menuIDs := make([]uint, 0, len(role.Menus))
	for _, m := range role.Menus {
		menuIDs = append(menuIDs, m.ID)
	}
	return menuIDs, nil
}

// GetRoleDataScope 查询角色当前的数据权限范围及自定义部门 ID 列表
func (s *RoleService) GetRoleDataScope(roleID uint) (*dto.RoleDataScopeRes, error) {
	var role entity.Role
	if err := s.DB.Preload("Depts").First(&role, roleID).Error; err != nil {
		return nil, errors.New("角色不存在")
	}

	ds := role.DataScope
	if datascope.IsSuperAdminRole(role.ID, role.Code) {
		ds = datascope.ScopeAll
	} else if !datascope.IsValidScope(ds) {
		ds = datascope.ScopeSelf
	}

	deptIDs := make([]uint, 0, len(role.Depts))
	for _, d := range role.Depts {
		deptIDs = append(deptIDs, d.ID)
	}

	return &dto.RoleDataScopeRes{
		RoleID:    role.ID,
		DataScope: ds,
		DeptIDs:   deptIDs,
	}, nil
}

// AssignDataScope 为角色配置数据权限范围；仅自定义范围保存部门绑定列表
func (s *RoleService) AssignDataScope(operatorScope *datascope.Scope, roleID uint, req dto.AssignRoleDataScopeReq) error {
	if !datascope.IsValidScope(req.DataScope) {
		return errors.New("无效的数据权限范围")
	}

	var role entity.Role
	if err := s.DB.First(&role, roleID).Error; err != nil {
		return errors.New("角色不存在")
	}

	if datascope.IsSuperAdminRole(role.ID, role.Code) {
		return errors.New("超级管理员默认拥有全部数据权限，不可修改")
	}

	if operatorScope == nil || (!operatorScope.IsSuperAdmin && !operatorScope.AllData) {
		if req.DataScope == datascope.ScopeAll {
			return errors.New("无权赋予角色全部数据权限")
		}
		if req.DataScope == datascope.ScopeCustom {
			for _, deptID := range req.DeptIDs {
				if !datascope.CanAccessDept(operatorScope, deptID) {
					return errors.New("自定义部门中包含超出自身数据范围的部门")
				}
			}
		}
	}

	uniqueDeptIDs := make([]uint, 0, len(req.DeptIDs))
	seen := make(map[uint]struct{}, len(req.DeptIDs))
	for _, id := range req.DeptIDs {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; !ok {
			seen[id] = struct{}{}
			uniqueDeptIDs = append(uniqueDeptIDs, id)
		}
	}

	var depts []entity.Dept
	if req.DataScope == datascope.ScopeCustom && len(uniqueDeptIDs) > 0 {
		if err := s.DB.Where("id IN ?", uniqueDeptIDs).Find(&depts).Error; err != nil {
			return err
		}
		if len(depts) != len(uniqueDeptIDs) {
			return errors.New("自定义部门中包含不存在或已删除的部门")
		}
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.Role{}).Where("id = ?", role.ID).Update("data_scope", req.DataScope).Error; err != nil {
			return err
		}
		if req.DataScope == datascope.ScopeCustom {
			return tx.Model(&role).Association("Depts").Replace(depts)
		}
		return tx.Model(&role).Association("Depts").Clear()
	})
}

// GetRolePerms 获取单个角色的所有权限标识列表
func (s *RoleService) GetRolePerms(roleID uint) ([]string, error) {
	return s.GetMultiRolePerms([]uint{roleID})
}

// GetMultiRolePerms 合并多个启用角色的权限标识列表；命中超级管理员直接返回 "*"
func (s *RoleService) GetMultiRolePerms(roleIDs []uint) ([]string, error) {
	if len(roleIDs) == 0 {
		return []string{}, nil
	}

	var roles []entity.Role
	if err := s.DB.Preload("Menus").Where("id IN ? AND status = 0", roleIDs).Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return []string{}, nil
	}

	for _, r := range roles {
		if datascope.IsSuperAdminRole(r.ID, r.Code) {
			return []string{"*"}, nil
		}
	}

	permsSet := make(map[string]struct{})
	for _, r := range roles {
		for _, m := range r.Menus {
			if m.Perms != "" {
				permsSet[m.Perms] = struct{}{}
			}
		}
	}

	perms := make([]string, 0, len(permsSet))
	for p := range permsSet {
		perms = append(perms, p)
	}
	slices.Sort(perms)
	return perms, nil
}

func (s *RoleService) ListWithKeyword(page, pageSize int, keyword string) ([]entity.Role, int64, error) {
	var entities []entity.Role
	var total int64
	var model entity.Role

	db := s.DB.Model(&model)
	if keyword != "" {
		db = db.Where("name LIKE ? OR code LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	db.Count(&total)
	err := db.Order("sort asc, id asc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&entities).Error

	return entities, total, err
}
