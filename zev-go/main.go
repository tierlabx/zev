package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"zev-go/config"
	_ "zev-go/docs"
	"zev-go/modules"
	_ "zev-go/modules/system"
	"zev-go/pkg/database"
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
	// 1. 加载配置
	cfg := config.LoadConfig()

	// 2. 初始化数据库
	db := database.Init(cfg)

	// 3. 初始化 Web 引擎
	r := gin.Default()
	_ = r.SetTrustedProxies(cfg.TrustedProxies)

	// 4. 注册并初始化所有业务模块
	modules.InitAll(r, db)

	// 5. 初始化并全自动构建 Swagger 文档
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

	// 设定 5 秒超时时间，给正在处理的请求一个收尾的机会
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("服务强制关闭", "err", err)
	}
	slog.Info("服务已退出")
}
