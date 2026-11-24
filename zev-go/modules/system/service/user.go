package service

import (
	"errors"
	"strings"
	"unicode/utf8"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"
	"zev-go/pkg/jwtx"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	*crud.BaseService[entity.User]
	roleService *RoleService
	menuService *MenuService
	deptService *DeptService
}

func NewUserService(db *gorm.DB, roleService *RoleService, menuService *MenuService, deptService *DeptService) *UserService {
	return &UserService{
		BaseService: crud.NewBaseService[entity.User](db),
		roleService: roleService,
		menuService: menuService,
		deptService: deptService,
	}
}

func (s *UserService) Login(req dto.LoginReq) (*dto.LoginRes, error) {
	var user entity.User
	err := s.DB.Where("username = ?", req.Username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	if user.Status == 1 {
		return nil, errors.New("账号已被禁用，请联系管理员")
	}

	// 查询角色名称
	var role entity.Role
	roleName := ""
	if err := s.DB.Select("name").First(&role, user.RoleID).Error; err == nil {
		roleName = role.Name
	}

	token, err := jwtx.GenerateToken(user.ID, user.Username, user.RoleID)
	if err != nil {
		return nil, errors.New("Token生成失败")
	}

	return &dto.LoginRes{
		Token:    token,
		Nickname: user.Nickname,
		RoleID:   user.RoleID,
		RoleName: roleName,
		Avatar:   user.Avatar,
	}, nil
}

// ListWithFilter 获取用户分页列表，叠加数据权限范围、部门子树筛选、关键词与状态筛选
func (s *UserService) ListWithFilter(scope *datascope.Scope, page, pageSize int, keyword string, deptID uint, status *int) ([]entity.User, int64, error) {
	var entities []entity.User
	var total int64

	db := s.DB.Model(&entity.User{}).
		Scopes(datascope.Apply(scope, datascope.Options{
			DeptColumn: "dept_id",
			UserColumn: "id",
		}))

	if kw := strings.TrimSpace(keyword); kw != "" {
		like := "%" + kw + "%"
		db = db.Where("username LIKE ? OR nickname LIKE ? OR email LIKE ?", like, like, like)
	}
	if deptID > 0 {
		deptIDs, err := s.deptService.GetDeptAndChildIDs(deptID)
		if err != nil {
			return nil, 0, err
		}
		if len(deptIDs) == 0 {
			return []entity.User{}, 0, nil
		}
		db = db.Where("dept_id IN ?", deptIDs)
	}
	if status != nil {
		db = db.Where("status = ?", *status)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := db.Preload("Roles").
		Order("id asc").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&entities).Error
	if err != nil {
		return nil, 0, err
	}

	s.enrichUsers(entities)
	return entities, total, nil
}

// GetUserByID 根据数据范围校验并获取单个用户详情
func (s *UserService) GetUserByID(scope *datascope.Scope, id uint) (*entity.User, error) {
	var user entity.User
	if err := s.DB.Preload("Roles").First(&user, id).Error; err != nil {
		return nil, errors.New("用户不存在")
	}
	if !datascope.CanAccessRecord(scope, user.DeptID, user.ID) {
		return nil, errors.New("无权访问该用户数据")
	}

	users := []entity.User{user}
	s.enrichUsers(users)
	return &users[0], nil
}

// CreateUser 创建用户：校验部门越权、角色分配越权并在事务内写入多角色关联
func (s *UserService) CreateUser(scope *datascope.Scope, req dto.UserCreateUpdateReq) error {
	username := strings.TrimSpace(req.Username)
	if username == "" {
		return errors.New("用户名不能为空")
	}

	var dupCount int64
	if err := s.DB.Model(&entity.User{}).Where("username = ?", username).Count(&dupCount).Error; err != nil {
		return err
	}
	if dupCount > 0 {
		return errors.New("用户名已存在")
	}

	if err := s.validateTargetDept(scope, req.DeptID, false); err != nil {
		return err
	}

	roleIDs := normalizeRoleIDs(req.RoleID, req.RoleIDs)
	roles, primaryRoleID, err := s.validateAssignableRoles(scope, roleIDs)
	if err != nil {
		return err
	}

	if req.Password == "" {
		return errors.New("新建用户时密码不能为空")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}

	var createdBy uint
	if scope != nil {
		createdBy = scope.UserID
	}

	user := entity.User{
		Username:  username,
		Password:  string(hashed),
		Nickname:  strings.TrimSpace(req.Nickname),
		Email:     strings.TrimSpace(req.Email),
		Avatar:    strings.TrimSpace(req.Avatar),
		DeptID:    req.DeptID,
		RoleID:    primaryRoleID,
		CreatedBy: createdBy,
		Status:    req.Status,
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		return tx.Model(&user).Association("Roles").Replace(roles)
	})
}

// UpdateUser 更新用户资料、部门与角色；校验记录权限、防越权及超管保护
func (s *UserService) UpdateUser(scope *datascope.Scope, req dto.UserCreateUpdateReq) error {
	if req.ID == 0 {
		return errors.New("用户ID不能为空")
	}

	var existingUser entity.User
	if err := s.DB.Preload("Roles").First(&existingUser, req.ID).Error; err != nil {
		return errors.New("用户不存在")
	}

	if !datascope.CanAccessRecord(scope, existingUser.DeptID, existingUser.ID) {
		return errors.New("无权修改该用户")
	}

	targetIsSuper := isUserSuperAdmin(&existingUser)
	if targetIsSuper && (scope == nil || !scope.IsSuperAdmin) {
		return errors.New("无权修改超级管理员账号")
	}

	if existingUser.ID == 1 && req.Status == 1 {
		return errors.New("禁止禁用系统初始超级管理员")
	}

	username := strings.TrimSpace(req.Username)
	if username == "" {
		return errors.New("用户名不能为空")
	}
	var dupCount int64
	if err := s.DB.Model(&entity.User{}).Where("username = ? AND id <> ?", username, existingUser.ID).Count(&dupCount).Error; err != nil {
		return err
	}
	if dupCount > 0 {
		return errors.New("用户名已存在")
	}

	if req.DeptID != existingUser.DeptID {
		if err := s.validateTargetDept(scope, req.DeptID, true); err != nil {
			return err
		}
	}

	roleIDs := normalizeRoleIDs(req.RoleID, req.RoleIDs)
	var roles []entity.Role
	primaryRoleID := existingUser.RoleID
	shouldUpdateRoles := len(roleIDs) > 0
	if shouldUpdateRoles {
		var err error
		roles, primaryRoleID, err = s.validateAssignableRoles(scope, roleIDs)
		if err != nil {
			return err
		}
		if existingUser.ID == 1 && !hasSuperAdminInRoles(roles) {
			return errors.New("禁止移除初始管理员的超级管理员角色")
		}
	}

	updates := map[string]any{
		"username": username,
		"nickname": strings.TrimSpace(req.Nickname),
		"email":    strings.TrimSpace(req.Email),
		"avatar":   strings.TrimSpace(req.Avatar),
		"dept_id":  req.DeptID,
		"role_id":  primaryRoleID,
		"status":   req.Status,
	}

	if req.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return errors.New("密码加密失败")
		}
		updates["password"] = string(hashed)
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.User{}).Where("id = ?", existingUser.ID).Updates(updates).Error; err != nil {
			return err
		}
		if shouldUpdateRoles {
			return tx.Model(&existingUser).Association("Roles").Replace(roles)
		}
		return nil
	})
}

// DeleteUser 删除用户（禁止删除自己与超管，校验数据权限并清理多角色关联）
func (s *UserService) DeleteUser(scope *datascope.Scope, id uint) error {
	if id == 0 {
		return errors.New("用户ID不能为空")
	}
	if scope != nil && scope.UserID == id {
		return errors.New("不能删除当前登录账号")
	}
	if id == 1 {
		return errors.New("禁止删除系统超级管理员")
	}

	var user entity.User
	if err := s.DB.Preload("Roles").First(&user, id).Error; err != nil {
		return errors.New("用户不存在")
	}
	if !datascope.CanAccessRecord(scope, user.DeptID, user.ID) {
		return errors.New("无权删除该用户")
	}
	if isUserSuperAdmin(&user) && (scope == nil || !scope.IsSuperAdmin) {
		return errors.New("无权删除超级管理员账号")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&user).Association("Roles").Clear(); err != nil {
			return err
		}
		return tx.Delete(&user).Error
	})
}

// AssignRoles 为用户分配一个或多个角色
func (s *UserService) AssignRoles(scope *datascope.Scope, userID uint, roleIDs []uint) error {
	var user entity.User
	if err := s.DB.Preload("Roles").First(&user, userID).Error; err != nil {
		return errors.New("用户不存在")
	}
	if !datascope.CanAccessRecord(scope, user.DeptID, user.ID) {
		return errors.New("无权操作该用户角色")
	}
	if isUserSuperAdmin(&user) && (scope == nil || !scope.IsSuperAdmin) {
		return errors.New("无权修改超级管理员的角色")
	}

	roles, primaryRoleID, err := s.validateAssignableRoles(scope, roleIDs)
	if err != nil {
		return err
	}
	if user.ID == 1 && !hasSuperAdminInRoles(roles) {
		return errors.New("禁止移除初始管理员的超级管理员角色")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.User{}).Where("id = ?", user.ID).Update("role_id", primaryRoleID).Error; err != nil {
			return err
		}
		return tx.Model(&user).Association("Roles").Replace(roles)
	})
}

func (s *UserService) GetUserInfo(userID uint) (*dto.UserInfoRes, error) {
	user, err := s.GetByID(userID)
	if err != nil {
		return nil, errors.New("用户不存在")
	}

	deptName := ""
	if user.DeptID > 0 {
		var dept entity.Dept
		if err := s.DB.Select("name").First(&dept, user.DeptID).Error; err == nil {
			deptName = dept.Name
		}
	}

	_, activeRoles, _, _ := datascope.LoadUserActiveRoles(s.DB, userID)
	roleIDs := make([]uint, 0, len(activeRoles))
	roleNames := make([]string, 0, len(activeRoles))
	roleName := ""
	roleCode := ""

	if len(activeRoles) > 0 {
		for _, r := range activeRoles {
			roleIDs = append(roleIDs, r.ID)
		}
		var fullRoles []entity.Role
		if err := s.DB.Select("id, name, code").Where("id IN ?", roleIDs).Order("sort asc, id asc").Find(&fullRoles).Error; err == nil {
			for i, r := range fullRoles {
				roleNames = append(roleNames, r.Name)
				if i == 0 {
					roleName = r.Name
					roleCode = r.Code
				}
				if datascope.IsSuperAdminRole(r.ID, r.Code) {
					roleName = r.Name
					roleCode = r.Code
				}
			}
		}
	} else {
		var role entity.Role
		if err := s.roleService.DB.First(&role, user.RoleID).Error; err == nil {
			roleName = role.Name
			roleCode = role.Code
		}
	}

	perms, _ := s.roleService.GetMultiRolePerms(roleIDs)
	if perms == nil {
		perms = []string{}
	}
	menuTree, _ := s.menuService.GetMenuTreeByRoles(roleIDs)

	var menus []any
	if menuTree != nil {
		menus = make([]any, len(menuTree))
		for i, m := range menuTree {
			menus[i] = m
		}
	} else {
		menus = []any{}
	}

	resolvedScope, _ := datascope.Resolve(s.DB, userID)
	effectiveDataScope := 0
	if resolvedScope != nil {
		effectiveDataScope = resolvedScope.DataScope
	}

	primaryRoleID := user.RoleID
	if len(roleIDs) > 0 {
		primaryRoleID = roleIDs[0]
	}

	return &dto.UserInfoRes{
		ID:          user.ID,
		Username:    user.Username,
		Nickname:    user.Nickname,
		Avatar:      user.Avatar,
		Email:       user.Email,
		DeptID:      user.DeptID,
		DeptName:    deptName,
		RoleID:      primaryRoleID,
		RoleIDs:     roleIDs,
		Roles:       roleNames,
		RoleName:    roleName,
		RoleCode:    roleCode,
		DataScope:   effectiveDataScope,
		Permissions: perms,
		Menus:       menus,
	}, nil
}

// UpdateProfile 允许当前登录用户自助修改昵称、邮箱与头像，限制字段白名单避免越权修改角色或状态
func (s *UserService) UpdateProfile(userID uint, req dto.UpdateProfileReq) (*dto.UserInfoRes, error) {
	if _, err := s.GetByID(userID); err != nil {
		return nil, errors.New("用户不存在")
	}

	nickname := strings.TrimSpace(req.Nickname)
	email := strings.TrimSpace(req.Email)
	avatar := strings.TrimSpace(req.Avatar)

	nicknameLen := utf8.RuneCountInString(nickname)
	if nicknameLen < 2 || nicknameLen > 50 {
		return nil, errors.New("昵称长度需在 2 到 50 个字符之间")
	}

	if avatar != "" &&
		!strings.HasPrefix(avatar, "http://") &&
		!strings.HasPrefix(avatar, "https://") &&
		!strings.HasPrefix(avatar, "/") {
		return nil, errors.New("头像地址仅支持 http://、https:// 或站内相对路径")
	}

	err := s.DB.Model(&entity.User{}).
		Where("id = ?", userID).
		Select("nickname", "email", "avatar").
		Updates(map[string]any{
			"nickname": nickname,
			"email":    email,
			"avatar":   avatar,
		}).Error
	if err != nil {
		return nil, err
	}

	return s.GetUserInfo(userID)
}

// ChangePassword 校验原密码后更新当前用户密码
func (s *UserService) ChangePassword(userID uint, req dto.ChangePasswordReq) error {
	user, err := s.GetByID(userID)
	if err != nil {
		return errors.New("用户不存在")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return errors.New("当前密码错误")
	}

	if req.OldPassword == req.NewPassword {
		return errors.New("新密码不能与当前密码相同")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}

	return s.DB.Model(&entity.User{}).Where("id = ?", userID).Update("password", string(hashed)).Error
}

func (s *UserService) validateTargetDept(scope *datascope.Scope, deptID uint, isUpdate bool) error {
	if deptID == 0 {
		if scope == nil || (!scope.IsSuperAdmin && !scope.AllData) {
			if isUpdate {
				return errors.New("非全局管理员不能移除用户的归属部门")
			}
			return errors.New("请选择归属部门")
		}
		return nil
	}

	var count int64
	if err := s.DB.Model(&entity.Dept{}).Where("id = ?", deptID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return errors.New("所选部门不存在")
	}
	if !datascope.CanAccessDept(scope, deptID) {
		return errors.New("无权操作超出自身数据范围的部门")
	}
	return nil
}

func (s *UserService) validateAssignableRoles(scope *datascope.Scope, roleIDs []uint) ([]entity.Role, uint, error) {
	if len(roleIDs) == 0 {
		return nil, 0, errors.New("请至少为用户分配一个角色")
	}

	var roles []entity.Role
	if err := s.DB.Where("id IN ?", roleIDs).Order("sort asc, id asc").Find(&roles).Error; err != nil {
		return nil, 0, err
	}
	if len(roles) != len(roleIDs) {
		return nil, 0, errors.New("所选角色中存在无效角色")
	}

	if hasSuperAdminInRoles(roles) && (scope == nil || !scope.IsSuperAdmin) {
		return nil, 0, errors.New("无权分配超级管理员角色")
	}

	return roles, roles[0].ID, nil
}

func (s *UserService) enrichUsers(users []entity.User) {
	if len(users) == 0 {
		return
	}

	deptIDSet := make(map[uint]struct{})
	for _, u := range users {
		if u.DeptID > 0 {
			deptIDSet[u.DeptID] = struct{}{}
		}
	}

	deptNames := make(map[uint]string)
	if len(deptIDSet) > 0 {
		deptIDs := make([]uint, 0, len(deptIDSet))
		for id := range deptIDSet {
			deptIDs = append(deptIDs, id)
		}
		var depts []entity.Dept
		if err := s.DB.Select("id, name").Where("id IN ?", deptIDs).Find(&depts).Error; err == nil {
			for _, d := range depts {
				deptNames[d.ID] = d.Name
			}
		}
	}

	for i := range users {
		users[i].DeptName = deptNames[users[i].DeptID]
		if len(users[i].Roles) > 0 {
			ids := make([]uint, 0, len(users[i].Roles))
			for _, r := range users[i].Roles {
				ids = append(ids, r.ID)
			}
			users[i].RoleIDs = ids
			users[i].RoleID = ids[0]
		} else if users[i].RoleID > 0 {
			users[i].RoleIDs = []uint{users[i].RoleID}
		} else {
			users[i].RoleIDs = []uint{}
		}
	}
}

func normalizeRoleIDs(single uint, multi []uint) []uint {
	seen := make(map[uint]struct{})
	res := make([]uint, 0, len(multi)+1)
	for _, id := range multi {
		if id > 0 {
			if _, ok := seen[id]; !ok {
				seen[id] = struct{}{}
				res = append(res, id)
			}
		}
	}
	if len(res) == 0 && single > 0 {
		res = append(res, single)
	}
	return res
}

func isUserSuperAdmin(user *entity.User) bool {
	if user.ID == 1 || user.RoleID == 1 {
		return true
	}
	return hasSuperAdminInRoles(user.Roles)
}

func hasSuperAdminInRoles(roles []entity.Role) bool {
	for _, r := range roles {
		if datascope.IsSuperAdminRole(r.ID, r.Code) {
			return true
		}
	}
	return false
}
