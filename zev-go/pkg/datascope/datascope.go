package datascope

import (
	"errors"
	"slices"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

const (
	// ScopeAll 全部数据权限
	ScopeAll = 1
	// ScopeCustom 自定数据权限（按角色绑定部门列表过滤）
	ScopeCustom = 2
	// ScopeDept 本部门数据权限
	ScopeDept = 3
	// ScopeDeptAndChild 本部门及以下数据权限
	ScopeDeptAndChild = 4
	// ScopeSelf 仅本人数据权限
	ScopeSelf = 5
)

var (
	// ErrUserNotFound 用户不存在或已被软删除
	ErrUserNotFound = errors.New("用户不存在")
	// ErrUserDisabled 用户已被禁用
	ErrUserDisabled = errors.New("账号已被禁用，请联系管理员")
)

// ActiveRole 表示用户当前启用且未删除的角色快照
type ActiveRole struct {
	ID        uint
	Code      string
	DataScope int
}

// RoleScopeInput 用于纯函数合并多角色数据权限的输入结构
type RoleScopeInput struct {
	RoleID        uint
	RoleCode      string
	DataScope     int
	CustomDeptIDs []uint
}

// DeptNode 描述部门节点与祖先物化路径，用于计算本部门及以下子孙集合
type DeptNode struct {
	ID        uint
	ParentID  uint
	Ancestors string
}

// Scope 保存解析并合并后的用户最终数据权限范围
type Scope struct {
	UserID       uint
	DeptID       uint
	IsSuperAdmin bool
	AllData      bool
	DeptIDs      []uint
	IncludeSelf  bool
	// DataScope 汇总当前多角色合并后的最高数据范围标识（无有效角色时为 0）
	DataScope int
}

// Options 控制 GORM 查询过滤时的表别名与部门/用户字段列名
type Options struct {
	TableAlias string
	// DeptColumn 部门外键列名；留空默认 "dept_id"，传入 "-" 表示忽略部门维度过滤
	DeptColumn string
	// UserColumn 归属用户列名；留空默认 "created_by"，传入 "-" 表示忽略用户维度过滤
	UserColumn string
}

// IsValidScope 校验数据权限枚举值是否合法（1~5）
func IsValidScope(scope int) bool {
	return scope >= ScopeAll && scope <= ScopeSelf
}

// IsSuperAdminRole 判断指定角色是否为超级管理员角色
func IsSuperAdminRole(roleID uint, roleCode string) bool {
	return roleID == 1 || roleCode == "admin"
}

// LoadUserActiveRoles 校验用户启用状态并实时加载其全部启用角色（兼容旧版 users.role_id）
func LoadUserActiveRoles(db *gorm.DB, userID uint) (uint, []ActiveRole, bool, error) {
	if db == nil || userID == 0 {
		return 0, nil, false, ErrUserNotFound
	}

	var userRow struct {
		ID     uint
		DeptID uint
		RoleID uint
		Status int
	}
	err := db.Table("users").
		Select("id, dept_id, role_id, status").
		Where("id = ? AND deleted_at IS NULL", userID).
		Take(&userRow).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil, false, ErrUserNotFound
		}
		return 0, nil, false, err
	}

	if userRow.Status == 1 {
		return userRow.DeptID, nil, false, ErrUserDisabled
	}

	var roles []ActiveRole
	err = db.Table("sys_user_roles").
		Select("roles.id, roles.code, roles.data_scope").
		Joins("JOIN roles ON roles.id = sys_user_roles.role_id AND roles.deleted_at IS NULL").
		Where("sys_user_roles.user_id = ? AND roles.status = 0", userID).
		Order("roles.id ASC").
		Scan(&roles).Error
	if err != nil {
		return userRow.DeptID, nil, false, err
	}

	// 向后兼容：若 sys_user_roles 尚无关联记录，则回退读取 users.role_id 指向的启用角色
	if len(roles) == 0 && userRow.RoleID > 0 {
		var fallbackRole ActiveRole
		fallbackErr := db.Table("roles").
			Select("id, code, data_scope").
			Where("id = ? AND status = 0 AND deleted_at IS NULL", userRow.RoleID).
			Take(&fallbackRole).Error
		if fallbackErr == nil {
			roles = append(roles, fallbackRole)
		} else if !errors.Is(fallbackErr, gorm.ErrRecordNotFound) {
			return userRow.DeptID, nil, false, fallbackErr
		}
	}

	isSuperAdmin := false
	for _, r := range roles {
		if IsSuperAdminRole(r.ID, r.Code) {
			isSuperAdmin = true
			break
		}
	}

	return userRow.DeptID, roles, isSuperAdmin, nil
}

// Resolve 从数据库实时解析并合并当前登录用户的有效数据权限范围
func Resolve(db *gorm.DB, userID uint) (*Scope, error) {
	deptID, roles, isSuperAdmin, err := LoadUserActiveRoles(db, userID)
	if err != nil {
		return nil, err
	}

	if len(roles) == 0 {
		return &Scope{
			UserID: userID,
			DeptID: deptID,
		}, nil
	}

	if isSuperAdmin {
		return &Scope{
			UserID:       userID,
			DeptID:       deptID,
			IsSuperAdmin: true,
			AllData:      true,
			DataScope:    ScopeAll,
		}, nil
	}

	var customRoleIDs []uint
	needDeptTree := false
	hasAll := false
	for _, r := range roles {
		switch r.DataScope {
		case ScopeAll:
			hasAll = true
		case ScopeCustom:
			customRoleIDs = append(customRoleIDs, r.ID)
		case ScopeDeptAndChild:
			needDeptTree = true
		}
	}

	customDeptsMap := make(map[uint][]uint)
	if !hasAll && len(customRoleIDs) > 0 {
		var rows []struct {
			RoleID uint
			DeptID uint
		}
		err = db.Table("sys_role_depts").
			Select("sys_role_depts.role_id, sys_role_depts.dept_id").
			Joins("JOIN depts ON depts.id = sys_role_depts.dept_id AND depts.deleted_at IS NULL").
			Where("sys_role_depts.role_id IN ?", customRoleIDs).
			Scan(&rows).Error
		if err != nil {
			return nil, err
		}
		for _, row := range rows {
			customDeptsMap[row.RoleID] = append(customDeptsMap[row.RoleID], row.DeptID)
		}
	}

	var allDepts []DeptNode
	if !hasAll && needDeptTree && deptID > 0 {
		err = db.Table("depts").
			Select("id, parent_id, ancestors").
			Where("deleted_at IS NULL").
			Scan(&allDepts).Error
		if err != nil {
			return nil, err
		}
	}

	inputs := make([]RoleScopeInput, 0, len(roles))
	for _, r := range roles {
		inputs = append(inputs, RoleScopeInput{
			RoleID:        r.ID,
			RoleCode:      r.Code,
			DataScope:     r.DataScope,
			CustomDeptIDs: customDeptsMap[r.ID],
		})
	}

	return MergeScopes(userID, deptID, inputs, allDepts), nil
}

// MergeScopes 将用户拥有的多个启用角色的数据权限合并为单一 Scope（取并集）
func MergeScopes(userID, userDeptID uint, roles []RoleScopeInput, allDepts []DeptNode) *Scope {
	scope := &Scope{
		UserID: userID,
		DeptID: userDeptID,
	}

	if len(roles) == 0 {
		return scope
	}

	deptSet := make(map[uint]struct{})
	var hasCustom, hasDeptAndChild, hasDept bool

	for _, r := range roles {
		if IsSuperAdminRole(r.RoleID, r.RoleCode) {
			scope.IsSuperAdmin = true
			scope.AllData = true
			continue
		}

		switch r.DataScope {
		case ScopeAll:
			scope.AllData = true
		case ScopeCustom:
			hasCustom = true
			for _, id := range r.CustomDeptIDs {
				if id > 0 {
					deptSet[id] = struct{}{}
				}
			}
		case ScopeDept:
			hasDept = true
			if userDeptID > 0 {
				deptSet[userDeptID] = struct{}{}
			}
		case ScopeDeptAndChild:
			hasDeptAndChild = true
			if userDeptID > 0 {
				for _, id := range CollectDeptAndChildren(userDeptID, allDepts) {
					deptSet[id] = struct{}{}
				}
			}
		case ScopeSelf:
			scope.IncludeSelf = true
		default:
			// 未知或未初始化的数据范围安全降级为仅本人
			scope.IncludeSelf = true
		}
	}

	if scope.IsSuperAdmin || scope.AllData {
		scope.AllData = true
		scope.DataScope = ScopeAll
		return scope
	}

	if len(deptSet) > 0 {
		scope.DeptIDs = make([]uint, 0, len(deptSet))
		for id := range deptSet {
			scope.DeptIDs = append(scope.DeptIDs, id)
		}
		slices.Sort(scope.DeptIDs)
	}

	switch {
	case hasCustom:
		scope.DataScope = ScopeCustom
	case hasDeptAndChild:
		scope.DataScope = ScopeDeptAndChild
	case hasDept:
		scope.DataScope = ScopeDept
	case scope.IncludeSelf:
		scope.DataScope = ScopeSelf
	}

	return scope
}

// CollectDeptAndChildren 收集指定部门自身及其全部子孙部门 ID
func CollectDeptAndChildren(deptID uint, allDepts []DeptNode) []uint {
	if deptID == 0 {
		return nil
	}

	idSet := map[uint]struct{}{deptID: {}}
	var target *DeptNode
	for i := range allDepts {
		if allDepts[i].ID == deptID {
			target = &allDepts[i]
			break
		}
	}

	// 若未在全量列表中找到目标节点，或节点未配置 ancestors，退化为仅依赖 ParentID BFS 或自身 ID
	if target == nil {
		return []uint{deptID}
	}

	idStr := strconv.FormatUint(uint64(deptID), 10)
	if target.Ancestors != "" {
		prefix := target.Ancestors + "," + idStr
		prefixWithComma := prefix + ","
		for _, node := range allDepts {
			if node.Ancestors == prefix || strings.HasPrefix(node.Ancestors, prefixWithComma) {
				idSet[node.ID] = struct{}{}
			}
		}
	} else {
		childrenByParent := make(map[uint][]uint)
		for _, node := range allDepts {
			if node.ParentID > 0 {
				childrenByParent[node.ParentID] = append(childrenByParent[node.ParentID], node.ID)
			}
		}
		queue := []uint{deptID}
		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]
			for _, childID := range childrenByParent[curr] {
				if _, exists := idSet[childID]; !exists {
					idSet[childID] = struct{}{}
					queue = append(queue, childID)
				}
			}
		}
	}

	result := make([]uint, 0, len(idSet))
	for id := range idSet {
		result = append(result, id)
	}
	slices.Sort(result)
	return result
}

// Apply 返回可挂载到 db.Scopes(...) 的 GORM 数据范围过滤函数；当无权限时采用默认拒绝策略 (1 = 0)
func Apply(scope *Scope, opts Options) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		if scope == nil {
			return db.Where("1 = 0")
		}
		if scope.IsSuperAdmin || scope.AllData {
			return db
		}

		deptCol := opts.DeptColumn
		if deptCol == "" {
			deptCol = "dept_id"
		}
		userCol := opts.UserColumn
		if userCol == "" {
			userCol = "created_by"
		}

		canFilterDept := deptCol != "-" && isSafeIdentifier(deptCol) && len(scope.DeptIDs) > 0
		canFilterUser := userCol != "-" && isSafeIdentifier(userCol) && scope.IncludeSelf && scope.UserID > 0

		alias := ""
		if opts.TableAlias != "" && isSafeIdentifier(opts.TableAlias) {
			alias = opts.TableAlias + "."
		}

		switch {
		case canFilterDept && canFilterUser:
			return db.Where("("+alias+deptCol+" IN ? OR "+alias+userCol+" = ?)", scope.DeptIDs, scope.UserID)
		case canFilterDept:
			return db.Where(alias+deptCol+" IN ?", scope.DeptIDs)
		case canFilterUser:
			return db.Where(alias+userCol+" = ?", scope.UserID)
		default:
			return db.Where("1 = 0")
		}
	}
}

// CanAccessRecord 校验当前用户数据范围是否有权访问指定归属部门或归属用户的记录
func CanAccessRecord(scope *Scope, targetDeptID, targetUserID uint) bool {
	if scope == nil {
		return false
	}
	if scope.IsSuperAdmin || scope.AllData {
		return true
	}
	if targetDeptID > 0 && slices.Contains(scope.DeptIDs, targetDeptID) {
		return true
	}
	if scope.IncludeSelf && scope.UserID > 0 && targetUserID == scope.UserID {
		return true
	}
	return false
}

// CanAccessDept 校验当前用户数据范围是否有权访问或操作指定部门节点
func CanAccessDept(scope *Scope, targetDeptID uint) bool {
	if scope == nil {
		return false
	}
	if scope.IsSuperAdmin || scope.AllData {
		return true
	}
	if targetDeptID == 0 {
		return false
	}
	return slices.Contains(scope.DeptIDs, targetDeptID)
}

func isSafeIdentifier(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		ch := s[i]
		if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_' || ch == '.') {
			return false
		}
	}
	return true
}
