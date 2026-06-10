package database

import (
	"fmt"
	"log/slog"
	"os"

	"zev-go/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Init 根据配置初始化并返回数据库连接实例
func Init(cfg config.Config) *gorm.DB {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		slog.Error("无法连接到数据库", "err", err)
		os.Exit(1)
	}
	slog.Info("数据库连接成功")
	return db
}
