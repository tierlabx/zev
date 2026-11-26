package portal

import (
	"bytes"
	"embed"
	"html/template"
	"io/fs"
	"log/slog"
	"net/http"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed index.html media/*
var portalFS embed.FS

var portalTmpl = template.Must(template.ParseFS(portalFS, "index.html"))

// Options 控制后端根路径导航门户页的展示元数据与入口开关。
type Options struct {
	Version        string
	EnvMode        string
	SwaggerEnabled bool
	ShowDevLinks   bool
}

type pageData struct {
	Version        string
	EnvMode        string
	GoVersion      string
	SwaggerEnabled bool
	SwaggerURL     string
	SwaggerSpecURL string
	PingURL        string
	ShowDevLinks   bool
	AdminDevURL    string
	StorybookURL   string
}

// Register 注册根路径 3D 导航门户页、内嵌媒体资源路由、/index.html 重定向以及 /favicon.ico 图标。
// 页面 HTML 在启动时预先渲染缓存，静态媒体通过 http.FileServer 提供原生 Range 206 流式响应支持。
func Register(r *gin.Engine, opts Options) {
	version := opts.Version
	if version == "" {
		version = "1.0"
	}
	envMode := opts.EnvMode
	if envMode == "" {
		envMode = gin.Mode()
	}

	data := pageData{
		Version:        version,
		EnvMode:        envMode,
		GoVersion:      runtime.Version(),
		SwaggerEnabled: opts.SwaggerEnabled,
		SwaggerURL:     "/swagger/index.html",
		SwaggerSpecURL: "/swagger/doc.json",
		PingURL:        "/api/ping",
		ShowDevLinks:   opts.ShowDevLinks,
		AdminDevURL:    "http://localhost:5173",
		StorybookURL:   "http://localhost:6006",
	}

	var buf bytes.Buffer
	if err := portalTmpl.Execute(&buf, data); err != nil {
		slog.Error("渲染根路径门户页模板失败", "err", err)
		buf.WriteString("<!doctype html><html lang=\"zh-CN\"><meta charset=\"utf-8\"><title>Zev API</title><body><a href=\"/swagger/index.html\">Swagger</a></body></html>")
	}
	renderedHTML := buf.Bytes()

	mediaSubFS, err := fs.Sub(portalFS, "media")
	if err != nil {
		slog.Error("初始化门户内嵌媒体子目录失败", "err", err)
	}
	mediaServer := http.StripPrefix("/portal/media/", http.FileServer(http.FS(mediaSubFS)))

	r.GET("/", func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", renderedHTML)
	})

	r.GET("/index.html", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/")
	})

	// 托管内嵌的 raea 3D 雕塑视频、海报帧与矢量 Logo，禁用目录浏览
	r.GET("/portal/media/*filepath", func(c *gin.Context) {
		relPath := strings.TrimPrefix(c.Param("filepath"), "/")
		if relPath == "" || strings.HasSuffix(relPath, "/") {
			c.Status(http.StatusNotFound)
			return
		}
		c.Header("Cache-Control", "public, max-age=86400")
		mediaServer.ServeHTTP(c.Writer, c.Request)
	})

	r.GET("/favicon.ico", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
}
