package seed

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"zev-go/modules"
	"zev-go/modules/system/dto"
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
	GrantRoles []string       `json:"grant_roles"`
	Depts      []DeptSeed     `json:"depts"`
	Roles      []RoleSeed     `json:"roles"`
	Users      []UserSeed     `json:"users"`
	Menus      []MenuSeed     `json:"menus"`
	DictTypes  []DictTypeSeed `json:"dict_types"`
	DictData   []DictDataSeed `json:"dict_data"`
}

// Run 按模块注册顺序合并导入种子数据（未传 seedPaths 时自动读取 modules.RegisteredSeeds）
func Run(db *gorm.DB, seedPaths ...string) {
	slog.Info("开始执行数据种子初始化...")

	sources := make([]modules.SeedSource, 0, len(seedPaths))
	if len(seedPaths) > 0 {
		for idx, p := range seedPaths {
			sources = append(sources, modules.SeedSource{
				Module: fmt.Sprintf("custom_%d", idx),
				Path:   p,
			})
		}
	} else {
		sources = modules.RegisteredSeeds()
	}

	if len(sources) == 0 {
		slog.Warn("未检测到已注册的模块种子文件，跳过初始化")
		return
	}

	var parsedSeeds []SeedData
	var mergedUsers []UserSeed
	for _, src := range sources {
		data, err := os.ReadFile(src.Path)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				slog.Warn("未找到模块种子文件，跳过", "module", src.Module, "seedPath", src.Path)
				continue
			}
			slog.Error("读取模块种子文件失败", "module", src.Module, "seedPath", src.Path, "err", err)
			os.Exit(1)
		}

		var s SeedData
		if err := json.Unmarshal(data, &s); err != nil {
			slog.Error("解析模块种子文件失败", "module", src.Module, "seedPath", src.Path, "err", err)
			os.Exit(1)
		}
		parsedSeeds = append(parsedSeeds, s)
		mergedUsers = append(mergedUsers, s.Users...)
	}

	if len(parsedSeeds) == 0 {
		return
	}

	// 按外键与关联依赖顺序事务性导入各模块种子：Depts -> Menus -> Roles -> GrantRoles -> Users -> DictTypes -> DictData
	err := db.Transaction(func(tx *gorm.DB) error {
		for _, seed := range parsedSeeds {
			if err := applyModuleSeed(tx, seed); err != nil {
				return err
			}
		}

		// 3. 对已部署存量库的幂等兼容回填（不覆盖已自定义修改的字段）
		if err := backfillLegacyPermissions(tx, SeedData{Users: mergedUsers}); err != nil {
			return err
		}

		// 3.5 当消息主表为空时幂等初始化欢迎公告，避免覆盖已有运营消息
		if err := seedInitialNotices(tx); err != nil {
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

// applyModuleSeed 事务性幂等导入单个模块的种子记录，并将新菜单自动授予 grant_roles 指定角色
func applyModuleSeed(tx *gorm.DB, seed SeedData) error {
	// 1. 导入部门
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

	// 2. 导入菜单（记录本次新插入的菜单 ID，供模块增量授权）
	var newMenuIDs []uint
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
			newMenuIDs = append(newMenuIDs, s.ID)
		}
	}

	// 3. 导入角色及初始菜单关联
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

	// 4. 模块增量授权：仅当本模块新导入了菜单且声明了 grant_roles 时，幂等追加至目标角色
	if len(seed.GrantRoles) > 0 && len(newMenuIDs) > 0 {
		var targetRoles []entity.Role
		if err := tx.Where("code IN ?", seed.GrantRoles).Find(&targetRoles).Error; err != nil {
			return fmt.Errorf("查询模块默认授权角色失败: %w", err)
		}
		var menus []entity.Menu
		if err := tx.Where("id IN ?", newMenuIDs).Find(&menus).Error; err != nil {
			return fmt.Errorf("查询模块新增菜单失败: %w", err)
		}
		if len(menus) > 0 {
			for i := range targetRoles {
				var existingIDs []uint
				if err := tx.Table("sys_role_menus").Where("role_id = ? AND menu_id IN ?", targetRoles[i].ID, newMenuIDs).Pluck("menu_id", &existingIDs).Error; err != nil {
					return fmt.Errorf("查询角色已有菜单关联失败: %w", err)
				}
				existingSet := make(map[uint]struct{}, len(existingIDs))
				for _, mid := range existingIDs {
					existingSet[mid] = struct{}{}
				}
				var toAppend []entity.Menu
				for _, m := range menus {
					if _, ok := existingSet[m.ID]; !ok {
						toAppend = append(toAppend, m)
					}
				}
				if len(toAppend) > 0 {
					if err := tx.Model(&targetRoles[i]).Association("Menus").Append(toAppend); err != nil {
						return fmt.Errorf("增量授予角色菜单权限失败: %w", err)
					}
				}
			}
		}
	}

	// 5. 导入用户及多角色关联
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

	// 6. 导入字典类型
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

	// 7. 导入字典数据
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

	return nil
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

// seedInitialNotices 当消息主表为空时幂等创建系统欢迎与安全审计提醒公告，并投递给全部启用用户
func seedInitialNotices(tx *gorm.DB) error {
	var count int64
	if err := tx.Unscoped().Model(&entity.SysNotice{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	var userIDs []uint
	if err := tx.Table("users").Where("status = ? AND deleted_at IS NULL", 0).Pluck("id", &userIDs).Error; err != nil {
		return err
	}

	now := time.Now()
	welcomeNotices := []entity.SysNotice{
		{
			Title:       "欢迎使用 ZEV 企业级后台管理系统",
			Content:     "消息中心已上线：支持系统公告广播、按部门/角色/个人定向通知、站内私信互动及实时推送提醒。",
			Type:        dto.NoticeTypeSystem,
			Level:       dto.NoticeLevelImportant,
			TargetType:  dto.NoticeTargetAll,
			TargetIDs:   "[]",
			Link:        "/messages",
			Status:      dto.NoticeStatusPublished,
			SenderID:    1,
			DeptID:      1,
			Sender:      "admin",
			PublishedAt: &now,
		},
		{
			Title:       "安全与操作审计提醒",
			Content:     "系统已全面开启操作与登录审计追踪，建议定期前往审计日志核查高危变更与异常登录事件。",
			Type:        dto.NoticeTypeReminder,
			Level:       dto.NoticeLevelNormal,
			TargetType:  dto.NoticeTargetAll,
			TargetIDs:   "[]",
			Link:        "/system/log",
			Status:      dto.NoticeStatusPublished,
			SenderID:    1,
			DeptID:      1,
			Sender:      "admin",
			PublishedAt: &now,
		},
	}

	for i := range welcomeNotices {
		if err := tx.Create(&welcomeNotices[i]).Error; err != nil {
			return fmt.Errorf("创建初始化系统公告失败: %w", err)
		}
		if len(userIDs) > 0 {
			recipients := make([]entity.SysNoticeRecipient, 0, len(userIDs))
			for _, uid := range userIDs {
				recipients = append(recipients, entity.SysNoticeRecipient{
					NoticeID: welcomeNotices[i].ID,
					UserID:   uid,
					IsRead:   false,
				})
			}
			if err := tx.CreateInBatches(&recipients, 200).Error; err != nil {
				return fmt.Errorf("创建初始化公告投递记录失败: %w", err)
			}
		}
	}

	return nil
}
