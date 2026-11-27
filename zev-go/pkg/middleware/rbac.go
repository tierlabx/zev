package middleware

import (
	"zev-go/pkg/datascope"
	"zev-go/pkg/perm"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RequirePermission 校验当前用户任一启用角色是否具备指定权限标识
func RequirePermission(db *gorm.DB, perm string) gin.HandlerFunc {
	return RequireAnyPermission(db, perm)
}

// RequireAnyPermission 校验当前用户任一启用角色是否具备候选权限标识中的至少一个
func RequireAnyPermission(db *gorm.DB, perms ...string) gin.HandlerFunc {
	// 路由装配时自动采集受保护接口所需的权限标识，作为级联权限树的基础源
	perm.Register(perms...)
	return func(c *gin.Context) {
		userIDAny, exists := c.Get("userID")
		if !exists {
			response.FailUnauthorized("无法获取当前用户信息", c)
			c.Abort()
			return
		}

		userID, ok := userIDAny.(uint)
		if !ok || userID == 0 {
			response.FailUnauthorized("用户信息格式错误", c)
			c.Abort()
			return
		}

		_, activeRoles, isSuperAdmin, err := datascope.LoadUserActiveRoles(db, userID)
		if err != nil {
			response.FailUnauthorized(err.Error(), c)
			c.Abort()
			return
		}

		// 超级管理员直接放行
		if isSuperAdmin {
			c.Next()
			return
		}

		if len(activeRoles) == 0 || len(perms) == 0 {
			response.FailMessage("权限不足，拒绝访问", c)
			c.Abort()
			return
		}

		roleIDs := make([]uint, 0, len(activeRoles))
		for _, r := range activeRoles {
			roleIDs = append(roleIDs, r.ID)
		}

		var rawPerms []string
		err = db.Table("sys_role_menus").
			Joins("JOIN menus ON menus.id = sys_role_menus.menu_id AND menus.deleted_at IS NULL").
			Where("sys_role_menus.role_id IN ? AND menus.perms <> ''", roleIDs).
			Pluck("menus.perms", &rawPerms).Error
		if err != nil || !perm.HasAny(rawPerms, perms) {
			response.FailMessage("权限不足，拒绝访问", c)
			c.Abort()
			return
		}

		c.Next()
	}
}
