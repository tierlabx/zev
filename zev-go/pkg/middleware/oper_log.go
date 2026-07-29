package middleware

import (
	"bytes"
	"time"

	"zev-go/modules/system/entity"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (r responseBodyWriter) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

func OperLogMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		if method != "POST" && method != "PUT" && method != "DELETE" {
			c.Next()
			return
		}

		startTime := time.Now()

		w := &responseBodyWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
		c.Writer = w

		c.Next()

		latency := time.Since(startTime).Milliseconds()
		
		operator := c.GetString("username")
		if operator == "" {
			operator = "Unknown"
		}

		status := 1
		if w.Status() >= 400 {
			status = 0
		}

		action := "其他"
		if method == "POST" {
			action = "新增/操作"
		} else if method == "PUT" {
			action = "修改"
		} else if method == "DELETE" {
			action = "删除"
		}

		logEntry := entity.SysOperLog{
			Operator: operator,
			Action:   action,
			Module:   "System",
			Method:   method,
			URL:      c.Request.URL.Path,
			IP:       c.ClientIP(),
			Status:   status,
			Latency:  latency,
		}
		
		go func(l entity.SysOperLog) {
			db.Create(&l)
		}(logEntry)
	}
}
