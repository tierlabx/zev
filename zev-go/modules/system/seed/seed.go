package seed

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"zev-go/modules/system/entity"
	"zev-go/pkg/datascope"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type DeptSeed struct {
	ID        uint   `json:"id"`
	ParentID  uint   `json:"parent_id"`
	Ancestors string `json:"ancestors"`
	Name      string `json:"name"`
	Code      string `json:"code"`
	Leader    string `json:"leader"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Sort      int    `json:"sort"`
	Status    int    `json:"status"`
}

type RoleSeed struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	Code      string `json:"code"`
	Status    int    `json:"status"`
	Sort      int    `json:"sort"`
	Desc      string `json:"desc"`
	DataScope int    `json:"data_scope"`
	MenuIDs   []uint `json:"menu_ids"`
}

type UserSeed struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	Avatar    string `json:"avatar"`
	DeptID    uint   `json:"dept_id"`
	RoleID    uint   `json:"role_id"`
	RoleIDs   []uint `json:"role_ids"`
	CreatedBy uint   `json:"created_by"`
	Status    int    `json:"status"`
}

type MenuSeed struct {
	ID        uint   `json:"id"`
	ParentID  uint   `json:"parent_id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	Component string `json:"component"`
	Icon      string `json:"icon"`
	Sort      int    `json:"sort"`
	Type      string `json:"type"`
	Perms     string `json:"perms"`
}

type DictTypeSeed struct {
	ID     uint   `json:"id"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Status int    `json:"status"`
	Remark string `json:"remark"`
}

type DictDataSeed struct {
	ID       uint   `json:"id"`
	DictType string `json:"dict_type"`
	Label    string `json:"label"`
	Value    string `json:"value"`
	Sort     int    `json:"sort"`
	Status   int    `json:"status"`
	Remark   string `json:"remark"`
}

type SeedData struct {
	Depts     []DeptSeed     `json:"depts"`
	Roles     []RoleSeed     `json:"roles"`
	Users     []UserSeed     `json:"users"`
	Menus     []MenuSeed     `json:"menus"`
	DictTypes []DictTypeSeed `json:"dict_types"`
	DictData  []DictDataSeed `json:"dict_data"`
}

func Run(db *gorm.DB, seedPath string) {
	slog.Info("开始执行数据种子初始化...")

	// 1. 读取 seed.json
	data, err := os.ReadFile(seedPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			slog.Warn("未找到种子文件，跳过初始化", "seedPath", seedPath)
			return
		}
		slog.Error("读取种子文件失败", "err", err)
		os.Exit(1)
	}

	var seed SeedData
	if err := json.Unmarshal(data, &seed); err != nil {
		slog.Error("解析种子文件失败", "err", err)
		os.Exit(1)
	}

	// 2. 按外键与关联依赖顺序事务性导入：Depts -> Menus -> Roles -> Users -> DictTypes -> DictData
	err = db.Transaction(func(tx *gorm.DB) error {
		// 2.1 导入部门
		for _, s := range seed.Depts {
			var count int64
			tx.Model(&entity.Dept{}).Unscoped().Where("id = ?", s.ID).Count(&count)
			if count == 0 {
				dept := entity.Dept{
					ParentID:  s.ParentID,
					Ancestors: s.Ancestors,
					Name:      s.Name,
					Code:      s.Code,
					Leader:    s.Leader,
					Phone:     s.Phone,
					Email:     s.Email,
					Sort:      s.Sort,
					Status:    s.Status,
				}
				dept.ID = s.ID
				if err := tx.Create(&dept).Error; err != nil {
					return fmt.Errorf("创建部门失败: %w", err)
				}
			}
		}

		// 2.2 导入菜单（须先于角色关联）
		for _, s := range seed.Menus {
			var count int64
			tx.Model(&entity.Menu{}).Unscoped().Where("id = ?", s.ID).Count(&count)
			if count == 0 {
				menu := entity.Menu{
					ParentID:  s.ParentID,
					Name:      s.Name,
					Path:      s.Path,
					Component: s.Component,
					Icon:      s.Icon,
					Sort:      s.Sort,
					Type:      s.Type,
					Perms:     s.Perms,
				}
				menu.ID = s.ID
				if err := tx.Create(&menu).Error; err != nil {
					return fmt.Errorf("创建菜单失败: %w", err)
				}
			}
		}

		// 2.3 导入角色及初始菜单关联
		for _, s := range seed.Roles {
			var count int64
			tx.Model(&entity.Role{}).Unscoped().Where("id = ?", s.ID).Count(&count)
			if count == 0 {
				ds := s.DataScope
				if !datascope.IsValidScope(ds) {
					ds = datascope.ScopeSelf
				}
				role := entity.Role{
					Name:      s.Name,
					Code:      s.Code,
					Status:    s.Status,
					Sort:      s.Sort,
					Desc:      s.Desc,
					DataScope: ds,
				}
				role.ID = s.ID

				if len(s.MenuIDs) > 0 {
					var menus []entity.Menu
					tx.Where("id IN ?", s.MenuIDs).Find(&menus)
					role.Menus = menus
				}

				if err := tx.Create(&role).Error; err != nil {
					return fmt.Errorf("创建角色失败: %w", err)
				}
			}
		}

		// 2.4 导入用户及多角色关联
		for _, s := range seed.Users {
			var count int64
			tx.Model(&entity.User{}).Unscoped().Where("id = ?", s.ID).Count(&count)
			if count == 0 {
				password := s.Password
				if password != "" && !strings.HasPrefix(password, "$2a$") {
					hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
					if err != nil {
						return fmt.Errorf("加密用户密码失败: %w", err)
					}
					password = string(hash)
				}
				user := entity.User{
					Username:  s.Username,
					Password:  password,
					Nickname:  s.Nickname,
					Email:     s.Email,
					Avatar:    s.Avatar,
					DeptID:    s.DeptID,
					RoleID:    s.RoleID,
					CreatedBy: s.CreatedBy,
					Status:    s.Status,
				}
				user.ID = s.ID

				targetRoleIDs := s.RoleIDs
				if len(targetRoleIDs) == 0 && s.RoleID > 0 {
					targetRoleIDs = []uint{s.RoleID}
				}
				if len(targetRoleIDs) > 0 {
					var roles []entity.Role
					tx.Where("id IN ?", targetRoleIDs).Find(&roles)
					user.Roles = roles
				}

				if err := tx.Create(&user).Error; err != nil {
					return fmt.Errorf("创建用户失败: %w", err)
				}
			}
		}

		// 2.5 导入字典类型
		for _, s := range seed.DictTypes {
			var count int64
			tx.Model(&entity.DictType{}).Unscoped().Where("id = ?", s.ID).Count(&count)
			if count == 0 {
				dt := entity.DictType{
					Name:   s.Name,
					Type:   s.Type,
					Status: s.Status,
					Remark: s.Remark,
				}
				dt.ID = s.ID
				if err := tx.Create(&dt).Error; err != nil {
					return fmt.Errorf("创建字典类型失败: %w", err)
				}
			}
		}

		// 2.6 导入字典数据
		for _, s := range seed.DictData {
			var count int64
			tx.Model(&entity.DictData{}).Unscoped().Where("id = ?", s.ID).Count(&count)
			if count == 0 {
				dd := entity.DictData{
					DictType: s.DictType,
					Label:    s.Label,
					Value:    s.Value,
					Sort:     s.Sort,
					Status:   s.Status,
					Remark:   s.Remark,
				}
				dd.ID = s.ID
				if err := tx.Create(&dd).Error; err != nil {
					return fmt.Errorf("创建字典数据失败: %w", err)
				}
			}
		}

		// 3. 对已部署存量库的幂等兼容回填（不覆盖已自定义修改的字段）
		if err := backfillLegacyPermissions(tx, seed); err != nil {
			return err
		}

		// 4. 重置 PostgreSQL 主键自增序列
		tables := []string{"depts", "roles", "users", "menus", "dict_types", "dict_data"}
		for _, table := range tables {
			sql := fmt.Sprintf("SELECT setval(pg_get_serial_sequence('%s', 'id'), COALESCE(max(id), 1)) FROM %s;", table, table)
			if err := tx.Exec(sql).Error; err != nil {
				slog.Warn("重置表自增序列提示", "table", table, "err", err)
			}
		}

		return nil
	})

	if err != nil {
		slog.Error("种子数据导入失败", "err", err)
		os.Exit(1)
	}

	slog.Info("数据种子初始化完成。")
}

// backfillLegacyPermissions 为存量数据库幂等补齐角色数据范围、用户部门与多角色关联表
func backfillLegacyPermissions(tx *gorm.DB, seed SeedData) error {
	// 超管角色强制保持 ScopeAll，未知历史数据范围回填为 ScopeSelf
	if err := tx.Model(&entity.Role{}).
		Where("(id = ? OR code = ?) AND data_scope <> ?", 1, "admin", datascope.ScopeAll).
		Update("data_scope", datascope.ScopeAll).Error; err != nil {
		return err
	}
	if err := tx.Model(&entity.Role{}).
		Where("data_scope = 0 OR data_scope IS NULL").
		Update("data_scope", datascope.ScopeSelf).Error; err != nil {
		return err
	}

	// 按 seed.Users 对未分配部门的默认账号补齐部门
	seedDeptByUserID := make(map[uint]uint, len(seed.Users))
	for _, su := range seed.Users {
		if su.DeptID > 0 {
			seedDeptByUserID[su.ID] = su.DeptID
		}
	}

	var users []entity.User
	if err := tx.Select("id, dept_id, role_id").Find(&users).Error; err != nil {
		return err
	}

	var hasRootDept int64
	tx.Model(&entity.Dept{}).Where("id = ?", 1).Count(&hasRootDept)

	for _, u := range users {
		if u.DeptID == 0 {
			fallbackDeptID := seedDeptByUserID[u.ID]
			if fallbackDeptID == 0 && hasRootDept > 0 {
				fallbackDeptID = 1
			}
			if fallbackDeptID > 0 {
				if err := tx.Model(&entity.User{}).Where("id = ? AND dept_id = 0", u.ID).Update("dept_id", fallbackDeptID).Error; err != nil {
					return err
				}
			}
		}

		if u.RoleID > 0 {
			var relCount int64
			if err := tx.Table("sys_user_roles").Where("user_id = ?", u.ID).Count(&relCount).Error; err != nil {
				return err
			}
			if relCount == 0 {
				var role entity.Role
				if err := tx.First(&role, u.RoleID).Error; err == nil {
					if err := tx.Model(&entity.User{Model: gorm.Model{ID: u.ID}}).Association("Roles").Append(&role); err != nil {
						return err
					}
				}
			}
		}
	}

	return nil
}
