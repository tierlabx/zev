package middleware

import (
	"zev-go/pkg/datascope"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DataScopeContextKey 在 Gin 上下文中存储已解析数据权限的键名
const DataScopeContextKey = "dataScope"

// DataScopeMiddleware 在受保护路由中解析用户实时数据权限并注入上下文
func DataScopeMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDAny, exists := c.Get("userID")
		if !exists {
			response.FailUnauthorized("无法获取用户信息", c)
			c.Abort()
			return
		}

		userID, ok := userIDAny.(uint)
		if !ok || userID == 0 {
			response.FailUnauthorized("用户ID格式错误", c)
			c.Abort()
			return
		}

		scope, err := datascope.Resolve(db, userID)
		if err != nil {
			response.FailUnauthorized(err.Error(), c)
			c.Abort()
			return
		}

		c.Set(DataScopeContextKey, scope)
		c.Next()
	}
}

// GetDataScope 从 Gin 上下文读取当前请求用户的数据权限范围
func GetDataScope(c *gin.Context) *datascope.Scope {
	if c == nil {
		return nil
	}
	val, exists := c.Get(DataScopeContextKey)
	if !exists {
		return nil
	}
	scope, ok := val.(*datascope.Scope)
	if !ok {
		return nil
	}
	return scope
}
