package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"zev-go/pkg/logger"

	"github.com/gin-gonic/gin"
)

const (
	// HeaderRequestID 链路追踪请求头
	HeaderRequestID = "X-Request-ID"
	// ContextKeyRequestID Gin 上下文存储的 RequestID 键名
	ContextKeyRequestID = "request_id"
)

func generateRequestID() string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err == nil {
		return hex.EncodeToString(buf)
	}
	return fmt.Sprintf("%x", time.Now().UnixNano())
}

func isValidRequestID(rid string) bool {
	if rid == "" || len(rid) > 64 {
		return false
	}
	for i := 0; i < len(rid); i++ {
		c := rid[i]
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_') {
			return false
		}
	}
	return true
}

// RequestIDMiddleware 为每次请求分配或透传安全的 X-Request-ID，并注入到 Go Context 中
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := strings.TrimSpace(c.GetHeader(HeaderRequestID))
		if !isValidRequestID(rid) {
			rid = generateRequestID()
		}
		c.Set(ContextKeyRequestID, rid)
		c.Request = c.Request.WithContext(logger.WithRequestID(c.Request.Context(), rid))
		c.Writer.Header().Set(HeaderRequestID, rid)
		c.Next()
	}
}

// GetRequestID 从 Gin 上下文读取链路追踪 RequestID
func GetRequestID(c *gin.Context) string {
	return c.GetString(ContextKeyRequestID)
}
