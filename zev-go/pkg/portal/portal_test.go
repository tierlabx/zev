package portal

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegister_SwaggerEnabledAndDevLinks(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	Register(r, Options{
		Version:        "1.0",
		EnvMode:        "debug",
		SwaggerEnabled: true,
		ShowDevLinks:   true,
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("期望状态码 200，实际为 %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Fatalf("期望 Content-Type 包含 text/html，实际为 %q", ct)
	}

	body := w.Body.String()
	expectedSubstrings := []string{
		`href="/swagger/index.html"`,
		`href="/swagger/doc.json"`,
		`data-ping-url="/api/ping"`,
		`/portal/media/zev-hero.mp4`,
		`/portal/media/zev-hero.webp`,
		`/portal/media/logo.svg`,
		`http://localhost:5173`,
		`http://localhost:6006`,
		`debug`,
	}
	for _, want := range expectedSubstrings {
		if !strings.Contains(body, want) {
			t.Errorf("响应 HTML 缺少预期内容 %q", want)
		}
	}
}

func TestRegister_ProductionSwaggerDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	Register(r, Options{
		Version:        "1.0",
		EnvMode:        "release",
		SwaggerEnabled: false,
		ShowDevLinks:   false,
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("期望状态码 200，实际为 %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "ENABLE_SWAGGER=true") {
		t.Errorf("生产禁用态应提示如何通过 ENABLE_SWAGGER=true 开启 Swagger")
	}
	forbidden := []string{
		`href="/swagger/index.html"`,
		`http://localhost:5173`,
		`http://localhost:6006`,
	}
	for _, item := range forbidden {
		if strings.Contains(body, item) {
			t.Errorf("生产禁用态不应包含 %q", item)
		}
	}
}

func TestRegister_MediaAssets(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	Register(r, Options{})

	cases := []struct {
		path        string
		wantContain string
	}{
		{"/portal/media/logo.svg", "svg"},
		{"/portal/media/zev-hero.webp", "webp"},
		{"/portal/media/zev-hero.mp4", "mp4"},
	}

	for _, tc := range cases {
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("请求 %s 期望状态码 200，实际为 %d", tc.path, w.Code)
		}
		if w.Body.Len() == 0 {
			t.Fatalf("请求 %s 返回空响应体", tc.path)
		}
		if ct := strings.ToLower(w.Header().Get("Content-Type")); !strings.Contains(ct, tc.wantContain) {
			t.Errorf("请求 %s 期望 Content-Type 包含 %q，实际为 %q", tc.path, tc.wantContain, ct)
		}
	}

	// 验证目录根路径禁止列出目录
	reqDir := httptest.NewRequest(http.MethodGet, "/portal/media/", nil)
	wDir := httptest.NewRecorder()
	r.ServeHTTP(wDir, reqDir)
	if wDir.Code != http.StatusNotFound {
		t.Fatalf("媒体目录路径应返回 404，实际为 %d", wDir.Code)
	}
}

func TestRegister_IndexRedirect(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	Register(r, Options{})

	req := httptest.NewRequest(http.MethodGet, "/index.html", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Fatalf("期望重定向状态码 302，实际为 %d", w.Code)
	}
	if loc := w.Header().Get("Location"); loc != "/" {
		t.Fatalf("期望重定向到 /，实际为 %q", loc)
	}
}

func TestRegister_FaviconNoContent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	Register(r, Options{})

	req := httptest.NewRequest(http.MethodGet, "/favicon.ico", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("期望状态码 204，实际为 %d", w.Code)
	}
}
