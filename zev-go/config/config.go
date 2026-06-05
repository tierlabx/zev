package config

import (
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost         string
	DBUser         string
	DBPassword     string
	DBName         string
	DBPort         string
	AppPort        string
	TrustedProxies []string
}

// LoadConfig 从环境变量中加载应用与数据库配置
func LoadConfig() Config {
	// 尝试加载 .env 文件，如果不存在也没关系（可能是生产环境直接传环境变量）
	_ = godotenv.Load()

	dbHost := getEnv("DB_HOST", "localhost")
	dbUser := getEnv("DB_USER", "zev")
	dbPassword := getEnv("DB_PASSWORD", "password")
	dbName := getEnv("DB_NAME", "zev")
	dbPort := getEnv("DB_PORT", "5432")
	appPort := getEnv("APP_PORT", "8080")
	trustedProxiesStr := getEnv("TRUSTED_PROXIES", "127.0.0.1")

	var trustedProxies []string
	if trustedProxiesStr != "" && trustedProxiesStr != "none" && trustedProxiesStr != "nil" {
		for _, proxy := range strings.Split(trustedProxiesStr, ",") {
			trustedProxies = append(trustedProxies, strings.TrimSpace(proxy))
		}
	}

	slog.Info("Loaded config for DB connection", "host", dbHost, "port", dbPort, "dbname", dbName)

	return Config{
		DBHost:         dbHost,
		DBUser:         dbUser,
		DBPassword:     dbPassword,
		DBName:         dbName,
		DBPort:         dbPort,
		AppPort:        appPort,
		TrustedProxies: trustedProxies,
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
