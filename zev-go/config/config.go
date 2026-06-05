package config

import (
	"log/slog"
	"os"
)

type Config struct {
	DBHost     string
	DBUser     string
	DBPassword string
	DBName     string
	DBPort     string
	AppPort    string
}

// LoadConfig 从环境变量中加载应用与数据库配置
func LoadConfig() Config {
	dbHost := getEnv("DB_HOST", "localhost")
	dbUser := getEnv("DB_USER", "zev")
	dbPassword := getEnv("DB_PASSWORD", "password")
	dbName := getEnv("DB_NAME", "zev")
	dbPort := getEnv("DB_PORT", "5432")
	appPort := getEnv("APP_PORT", "8080")

	slog.Info("Loaded config for DB connection", "host", dbHost, "port", dbPort, "dbname", dbName)

	return Config{
		DBHost:     dbHost,
		DBUser:     dbUser,
		DBPassword: dbPassword,
		DBName:     dbName,
		DBPort:     dbPort,
		AppPort:    appPort,
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
