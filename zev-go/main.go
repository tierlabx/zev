package main

import (
	"fmt"
	"log/slog"
	"os"

	"zev-go/config"
	_ "zev-go/docs"
	"zev-go/modules/system"
	"zev-go/pkg/middleware"
	"zev-go/pkg/swagger"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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
func main() {
	cfg := config.LoadConfig()
	initDB(cfg)

	r := gin.Default()

	// 跨域处理中间件
	r.Use(middleware.Cors())

	r.GET("/api/ping", PingHandler)

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	system.InitModule(r, DB)

	port := cfg.AppPort
	if port == "" {
		port = "8080"
	}

	// 等所有模块和路由注册完毕后再执行自动生成
	swagger.AutoUpdate()
	if err := r.Run(":" + port); err != nil {
		slog.Error("服务启动失败", "err", err)
		os.Exit(1)
	}
}

// PingHandler
// @Summary Ping
// @Description 测试服务是否正常运行
// @Tags 测试
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/ping [get]
func PingHandler(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "pong",
	})
}
