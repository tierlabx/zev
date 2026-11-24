package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"zev-go/modules/system/entity"
	"zev-go/pkg/audit"
	"zev-go/pkg/logger"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	maxBodyReadBytes  = 1 << 20   // 1MB 读取上限，避免恶意超大包拖垮内存
	maxLogRecordBytes = 4096      // 单条日志请求/响应体持久化上限
	maxRespBufferSize = 16 * 1024 // 响应体缓冲上限
)

// bodyLogWriter 自定义 ResponseWriter 包装器，在透传响应的同时截取前 16KB 用于业务状态与错误提取
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	if remain := maxRespBufferSize - w.body.Len(); remain > 0 {
		if len(b) > remain {
			w.body.Write(b[:remain])
		} else {
			w.body.Write(b)
		}
	}
	return w.ResponseWriter.Write(b)
}

func (w *bodyLogWriter) WriteString(s string) (int, error) {
	if remain := maxRespBufferSize - w.body.Len(); remain > 0 {
		if len(s) > remain {
			w.body.WriteString(s[:remain])
		} else {
			w.body.WriteString(s)
		}
	}
	return w.ResponseWriter.WriteString(s)
}

// OperLogMiddleware 操作日志审计中间件（仅记录写操作及关键导出/清理动作）
func OperLogMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
			c.Next()
			return
		}

		start := time.Now()
		reqBodyPreview := captureSanitizedRequestBody(c)

		blw := &bodyLogWriter{
			body:           bytes.NewBuffer(nil),
			ResponseWriter: c.Writer,
		}
		c.Writer = blw

		c.Next()

		latency := time.Since(start).Milliseconds()

		var userID uint
		var deptID uint
		operator := "anonymous"

		if val, exists := c.Get("username"); exists {
			if name, ok := val.(string); ok && name != "" {
				operator = name
			}
		}
		if scope := GetDataScope(c); scope != nil {
			userID = scope.UserID
			deptID = scope.DeptID
		} else if val, exists := c.Get("userID"); exists {
			if uid, ok := val.(uint); ok {
				userID = uid
			}
		}

		path := c.Request.URL.Path
		module, action := resolveModuleAndAction(method, path)
		status, errMsg, respPreview := evaluateResponseOutcome(c, blw)

		ua := c.Request.UserAgent()
		browser, osName := logger.ParseUserAgent(ua)

		record := &entity.SysOperLog{
			RequestID:    GetRequestID(c),
			UserID:       userID,
			DeptID:       deptID,
			Operator:     operator,
			Action:       action,
			Module:       module,
			Method:       method,
			URL:          logger.TruncateString(path, 255),
			QueryParams:  logger.SanitizeQuery(c.Request.URL.RawQuery, maxLogRecordBytes),
			RequestBody:  reqBodyPreview,
			ResponseBody: respPreview,
			IP:           c.ClientIP(),
			UserAgent:    logger.TruncateString(ua, 500),
			Browser:      browser,
			OS:           osName,
			Status:       status,
			ErrorMsg:     logger.TruncateString(errMsg, 1000),
			Latency:      latency,
		}

		// 优先投递到有界异步审计队列，测试环境未初始化队列时同步降级写入 DB
		if !audit.Submit(record) && db != nil {
			_ = db.Create(record).Error
		}
	}
}

func captureSanitizedRequestBody(c *gin.Context) string {
	if c.Request.Body == nil {
		return ""
	}
	contentType := strings.ToLower(c.GetHeader("Content-Type"))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		return "[multipart/form-data]"
	}
	if strings.HasPrefix(contentType, "application/octet-stream") {
		return "[binary stream]"
	}

	raw, err := io.ReadAll(io.LimitReader(c.Request.Body, maxBodyReadBytes))
	// 将读取出的字节拼回 Body，保证后续 Handler 能完整读取请求体
	c.Request.Body = io.NopCloser(io.MultiReader(bytes.NewReader(raw), c.Request.Body))
	if err != nil || len(raw) == 0 {
		return ""
	}
	return logger.SanitizeJSON(raw, maxLogRecordBytes)
}

func evaluateResponseOutcome(c *gin.Context, blw *bodyLogWriter) (status int, errMsg, respPreview string) {
	status = 1
	respContentType := strings.ToLower(c.Writer.Header().Get("Content-Type"))
	if strings.Contains(respContentType, "text/csv") || strings.Contains(respContentType, "application/octet-stream") {
		respPreview = "[binary/file stream]"
	} else {
		respPreview = logger.SanitizeJSON(blw.body.Bytes(), maxLogRecordBytes)
	}

	if c.Writer.Status() >= http.StatusBadRequest {
		status = 0
	}
	if len(c.Errors) > 0 {
		status = 0
		errMsg = c.Errors.String()
	}

	// ZEV 业务接口失败常返回 HTTP 200 + {code != 200, msg}，必须解析响应体才能准确识别失败状态
	var bizResp struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	}
	if blw.body.Len() > 0 && json.Unmarshal(blw.body.Bytes(), &bizResp) == nil {
		if bizResp.Code != 0 && bizResp.Code != response.CodeSuccess {
			status = 0
			if errMsg == "" {
				errMsg = bizResp.Msg
			}
		}
	}
	return status, errMsg, respPreview
}

func resolveModuleAndAction(method, path string) (module, action string) {
	switch {
	case strings.Contains(path, "/system/dept"):
		module = "部门管理"
	case strings.Contains(path, "/system/user/profile"):
		return "个人中心", "修改资料"
	case strings.Contains(path, "/system/user/password"):
		return "个人中心", "修改密码"
	case strings.Contains(path, "/system/user/role"):
		return "用户管理", "分配角色"
	case strings.Contains(path, "/system/user/logout"):
		return "认证授权", "退出登录"
	case strings.Contains(path, "/system/user"):
		module = "用户管理"
	case strings.Contains(path, "/system/role/menus"):
		return "角色管理", "分配菜单权限"
	case strings.Contains(path, "/system/role/datascope"):
		return "角色管理", "配置数据权限"
	case strings.Contains(path, "/system/role"):
		module = "角色管理"
	case strings.Contains(path, "/system/menu"):
		module = "菜单管理"
	case strings.Contains(path, "/system/dict/type"):
		module = "字典类型"
	case strings.Contains(path, "/system/dict/data"):
		module = "字典数据"
	case strings.Contains(path, "/system/notice/read-all"):
		return "消息中心", "全部已读"
	case strings.Contains(path, "/system/notice/unread"):
		return "消息中心", "标为未读"
	case strings.Contains(path, "/system/notice/read"):
		return "消息中心", "标记已读"
	case strings.Contains(path, "/system/notice/my"):
		return "消息中心", "删除消息"
	case strings.Contains(path, "/system/notice/direct"):
		return "消息中心", "发送私信"
	case strings.Contains(path, "/system/notice/publish"):
		return "消息管理", "发布消息"
	case strings.Contains(path, "/system/notice/revoke"):
		return "消息管理", "撤回消息"
	case strings.Contains(path, "/system/notice"):
		module = "消息管理"
	case strings.Contains(path, "/system/log/oper"):
		module = "操作日志"
	case strings.Contains(path, "/system/log/login"):
		module = "登录日志"
	default:
		module = "系统管理"
	}

	switch {
	case strings.Contains(path, "/clear"):
		action = "清空"
	case strings.Contains(path, "/export"):
		action = "导出"
	case method == http.MethodPost:
		action = "新增"
	case method == http.MethodPut || method == http.MethodPatch:
		action = "修改"
	case method == http.MethodDelete:
		action = "删除"
	default:
		action = method
	}
	return module, action
}
