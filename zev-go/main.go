package main

import (
	"fmt"
	"log/slog"
	"os"

	"zev-go/config"
	_ "zev-go/docs"
	"zev-go/modules"
	_ "zev-go/modules/system"
	"zev-go/pkg/swagger"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func initDB(cfg config.Config) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		slog.Error("无法连接到数据库", "err", err)
		os.Exit(1)
	}
	slog.Info("数据库连接成功")
}

// @title           Zev API
// @version         1.0
// @description     Zev Go Backend API documentation
// @host      localhost:8080
// @BasePath  /
// @securityDefinitions.apikey Bearer
// @description 输入“Bearer”，后跟一个空格和 JWT 令牌。
func main() {
	cfg := config.LoadConfig()
	initDB(cfg)

	r := gin.Default()

	// 明确配置信任的代理，解决 [GIN-debug] 警告。支持通过环境变量 TRUSTED_PROXIES 配置（逗号分隔的 IP 列表）
	_ = r.SetTrustedProxies(cfg.TrustedProxies)

	modules.InitAll(r, DB)

	port := cfg.AppPort
	if port == "" {
		port = "8080"
	}

	// 初始化并全自动构建 Swagger 文档
	swagger.Init()
	if err := r.Run(":" + port); err != nil {
		slog.Error("服务启动失败", "err", err)
		os.Exit(1)
	}
}
