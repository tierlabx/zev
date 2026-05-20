package middleware

import (
	"strings"

	"zev-go/pkg/jwtx"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.FailMessage("无访问权限，请先登录", c)
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			response.FailMessage("请求头中auth格式有误", c)
			c.Abort()
			return
		}

		claims, err := jwtx.ParseToken(parts[1])
		if err != nil {
			response.FailMessage("无效的Token", c)
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("roleID", claims.RoleID)
		c.Set("username", claims.Subject)
		c.Next()
	}
}
