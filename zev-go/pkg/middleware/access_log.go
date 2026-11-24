package middleware

import (
	"errors"
	"net"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"

	"zev-go/pkg/logger"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

// AccessLogMiddleware 结构化记录每次 HTTP 请求访问日志
func AccessLogMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		rawQuery := c.Request.URL.RawQuery

		c.Next()

		if strings.HasPrefix(path, "/swagger/") {
			return
		}

		latencyMs := time.Since(start).Milliseconds()
		status := c.Writer.Status()
		attrs := []any{
			"method", c.Request.Method,
			"path", path,
			"status", status,
			"latency_ms", latencyMs,
			"ip", c.ClientIP(),
			"bytes", c.Writer.Size(),
		}
		if rawQuery != "" {
			attrs = append(attrs, "query", logger.SanitizeQuery(rawQuery, 512))
		}
		if uidAny, exists := c.Get("userID"); exists {
			if uid, ok := uidAny.(uint); ok && uid > 0 {
				attrs = append(attrs, "user_id", uid)
			}
		}

		lgr := logger.FromContext(c.Request.Context())
		switch {
		case status >= http.StatusInternalServerError:
			lgr.Error("HTTP请求异常", attrs...)
		case status >= http.StatusBadRequest:
			lgr.Warn("HTTP请求失败", attrs...)
		default:
			lgr.Info("HTTP请求完成", attrs...)
		}
	}
}

func isBrokenPipeError(err any) bool {
	e, ok := err.(error)
	if !ok {
		return false
	}
	var ne *net.OpError
	if errors.As(e, &ne) {
		var se *os.SyscallError
		if errors.As(ne, &se) {
			msg := strings.ToLower(se.Error())
			if strings.Contains(msg, "broken pipe") || strings.Contains(msg, "connection reset by peer") {
				return true
			}
		}
	}
	return false
}

// RecoveryMiddleware 捕获未处理 Panic 并输出结构化堆栈，同时返回统一 JSON 响应
func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				lgr := logger.FromContext(c.Request.Context())
				if isBrokenPipeError(err) {
					lgr.Warn("客户端连接已断开",
						"method", c.Request.Method,
						"path", c.Request.URL.Path,
						"err", err,
					)
					_ = c.Error(errors.New("broken pipe"))
					c.Abort()
					return
				}

				lgr.Error("HTTP请求发生未捕获Panic",
					"method", c.Request.Method,
					"path", c.Request.URL.Path,
					"ip", c.ClientIP(),
					"panic", err,
					"stack", string(debug.Stack()),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, response.Response{
					Code: response.CodeError,
					Msg:  "服务器内部错误，请联系管理员",
				})
			}
		}()
		c.Next()
	}
}
