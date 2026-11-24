package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

func TestResolveModuleAndAction(t *testing.T) {
	cases := []struct {
		method string
		path   string
		module string
		action string
	}{
		{http.MethodPost, "/api/system/user/create", "用户管理", "新增"},
		{http.MethodPut, "/api/system/role/datascope/3", "角色管理", "配置数据权限"},
		{http.MethodPost, "/api/system/role/menus/2", "角色管理", "分配菜单权限"},
		{http.MethodDelete, "/api/system/log/oper/delete", "操作日志", "删除"},
		{http.MethodPost, "/api/system/log/login/clear", "登录日志", "清空"},
		{http.MethodPut, "/api/system/user/password", "个人中心", "修改密码"},
	}

	for _, tc := range cases {
		mod, act := resolveModuleAndAction(tc.method, tc.path)
		if mod != tc.module || act != tc.action {
			t.Fatalf("%s %s => (%s, %s), want (%s, %s)", tc.method, tc.path, mod, act, tc.module, tc.action)
		}
	}
}

func TestEvaluateResponseOutcomeDetectsBusinessFailureOnHTTP200(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	blw := &bodyLogWriter{
		ResponseWriter: c.Writer,
		body:           bytes.NewBufferString(`{"code":500,"msg":"无权限操作该记录"}`),
	}
	c.Writer = blw

	status, errMsg, _ := evaluateResponseOutcome(c, blw)
	if status != 0 {
		t.Fatalf("expected status=0 on business failure, got %d", status)
	}
	if errMsg != "无权限操作该记录" {
		t.Fatalf("expected errMsg preserved, got %q", errMsg)
	}

	blwOK := &bodyLogWriter{
		ResponseWriter: c.Writer,
		body:           bytes.NewBufferString(`{"code":200,"msg":"success","data":{"token":"raw-secret"}}`),
	}
	statusOK, errMsgOK, previewOK := evaluateResponseOutcome(c, blwOK)
	if statusOK != 1 || errMsgOK != "" {
		t.Fatalf("expected status=1 on code 200, got (%d, %q)", statusOK, errMsgOK)
	}
	if response.CodeSuccess != 200 || bytes.Contains([]byte(previewOK), []byte("raw-secret")) {
		t.Fatalf("expected token in response preview masked, got %s", previewOK)
	}
}
