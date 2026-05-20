package seed

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"zev-go/modules/system/entity"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type RoleSeed struct {
	ID      uint   `json:"id"`
	Name    string `json:"name"`
	Code    string `json:"code"`
	Status  int    `json:"status"`
	Sort    int    `json:"sort"`
	Desc    string `json:"desc"`
	MenuIDs []uint `json:"menu_ids"`
}

type UserSeed struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
	RoleID   uint   `json:"role_id"`
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
	Roles     []RoleSeed     `json:"roles"`
	Users     []UserSeed     `json:"users"`
	Menus     []MenuSeed     `json:"menus"`
	DictTypes []DictTypeSeed `json:"dict_types"`
	DictData  []DictDataSeed `json:"dict_data"`
}

func Run(db *gorm.DB, seedPath string) {
	log.Println("开始执行数据种子初始化...")

	// 1. 读取 seed.json
	data, err := os.ReadFile(seedPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			log.Printf("未找到种子文件 %s，跳过初始化", seedPath)
			return
		}
		log.Fatalf("读取种子文件失败: %v", err)
	}

	var seed SeedData
	if err := json.Unmarshal(data, &seed); err != nil {
		log.Fatalf("解析种子文件失败: %v", err)
	}

	// 2. 事务性导入数据
	err = db.Transaction(func(tx *gorm.DB) error {
		// 导入角色
		for _, s := range seed.Roles {
			var count int64
			tx.Model(&entity.Role{}).Where("id = ?", s.ID).Count(&count)
			if count == 0 {
				role := entity.Role{
					Name:   s.Name,
					Code:   s.Code,
					Status: s.Status,
					Sort:   s.Sort,
					Desc:   s.Desc,
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

		// 导入用户
		for _, s := range seed.Users {
			var count int64
			tx.Model(&entity.User{}).Where("id = ?", s.ID).Count(&count)
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
					Username: s.Username,
					Password: password,
					Nickname: s.Nickname,
					RoleID:   s.RoleID,
				}
				user.ID = s.ID
				if err := tx.Create(&user).Error; err != nil {
					return fmt.Errorf("创建用户失败: %w", err)
				}
			}
		}

		// 导入菜单
		for _, s := range seed.Menus {
			var count int64
			tx.Model(&entity.Menu{}).Where("id = ?", s.ID).Count(&count)
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

		// 导入字典类型
		for _, s := range seed.DictTypes {
			var count int64
			tx.Model(&entity.DictType{}).Where("id = ?", s.ID).Count(&count)
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

		// 导入字典数据
		for _, s := range seed.DictData {
			var count int64
			tx.Model(&entity.DictData{}).Where("id = ?", s.ID).Count(&count)
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

		// 3. 重置 PostgreSQL 主键自增序列
		tables := []string{"roles", "users", "menus", "dict_types", "dict_data"}
		for _, table := range tables {
			sql := fmt.Sprintf("SELECT setval(pg_get_serial_sequence('%s', 'id'), COALESCE(max(id), 1)) FROM %s;", table, table)
			if err := tx.Exec(sql).Error; err != nil {
				log.Printf("重置表 %s 自增序列提示: %v", table, err)
			}
		}

		return nil
	})

	if err != nil {
		log.Fatalf("种子数据导入失败: %v", err)
	}

	log.Println("数据种子初始化完成。")
}
