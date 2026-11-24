package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"zev-go/config"
	_ "zev-go/docs"
	"zev-go/modules"
	_ "zev-go/modules/system"
	"zev-go/pkg/audit"
	"zev-go/pkg/database"
	"zev-go/pkg/jwtx"
	"zev-go/pkg/logger"
	"zev-go/pkg/middleware"
	"zev-go/pkg/swagger"

	"github.com/gin-gonic/gin"
)

// @title           Zev API
// @version         1.0
// @description     Zev Go Admin 端接口
// @host      localhost:8080
// @BasePath  /
// @securityDefinitions.apikey Bearer
// @in header
// @name Authorization
// @description 输入“Bearer”，后跟一个空格和 JWT 令牌。
func main() {
	// 1. 加载配置并第一时间初始化结构化日志系统，确保后续启动阶段日志格式统一
	cfg := config.LoadConfig()
	closeLogger, err := logger.Init(logger.Options{
		Level:      cfg.LogLevel,
		Format:     cfg.LogFormat,
		FilePath:   cfg.LogFile,
		MaxSizeMB:  cfg.LogMaxSizeMB,
		MaxBackups: cfg.LogMaxBackups,
	})
	if err != nil {
		slog.Error("初始化日志系统失败", "err", err)
		os.Exit(1)
	}
	defer func() {
		if err := closeLogger(); err != nil {
			slog.Error("关闭日志文件失败", "err", err)
		}
	}()

	// 2. 初始化 JWT
	jwtx.Init(cfg.JWTSecret, cfg.JWTExpireHours)

	// 3. 初始化数据库与异步审计写入队列
	db := database.Init(cfg)
	audit.Init(db, 1024)

	// 4. 初始化 Web 引擎（替换 Gin 默认 Logger/Recovery，统一接入 RequestID 与结构化访问日志）
	if strings.EqualFold(os.Getenv("GIN_MODE"), "release") {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(middleware.RequestIDMiddleware(), middleware.AccessLogMiddleware(), middleware.RecoveryMiddleware())
	_ = r.SetTrustedProxies(cfg.TrustedProxies)

	// 5. 注册并初始化所有业务模块
	modules.InitAll(r, db)

	// 6. 初始化并全自动构建 Swagger 文档
	swagger.Init()

	// 6. 启动 HTTP 服务（配置优雅停机）
	port := cfg.AppPort
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("服务启动失败", "err", err)
			os.Exit(1)
		}
	}()
	slog.Info("服务启动成功", "port", port)

	// 监听系统中断信号（如 Ctrl+C, Docker stop 等）
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("正在关闭服务...")

	// 设定 5 秒超时时间，给正在处理的请求和异步审计队列一个排空收尾的机会
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("服务强制关闭", "err", err)
	}
	if err := audit.Shutdown(ctx); err != nil {
		slog.Error("异步审计队列排空超时", "err", err)
	}
	slog.Info("服务已退出")
}
