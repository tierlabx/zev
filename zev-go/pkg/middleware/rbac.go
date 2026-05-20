package middleware

import (
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RequirePermission(db *gorm.DB, perm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleIDAny, exists := c.Get("roleID")
		if !exists {
			response.FailMessage("无法获取角色信息", c)
			c.Abort()
			return
		}

		roleID, ok := roleIDAny.(uint)
		if !ok {
			response.FailMessage("角色信息格式错误", c)
			c.Abort()
			return
		}

		// 超级管理员直接放行
		if roleID == 1 {
			c.Next()
			return
		}

		var count int64
		err := db.Table("sys_role_menus").
			Joins("JOIN menus ON menus.id = sys_role_menus.menu_id AND menus.deleted_at IS NULL").
			Where("sys_role_menus.role_id = ? AND menus.perms = ?", roleID, perm).
			Count(&count).Error

		if err != nil || count == 0 {
			response.FailMessage("权限不足，拒绝访问", c)
			c.Abort()
			return
		}

		c.Next()
	}
}
