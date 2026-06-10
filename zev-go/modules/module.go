package modules

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Module 定义了系统中每个业务模块必须实现的接口约束
type Module interface {
	// Init 负责模块的初始化（包括数据库迁移、基础数据填充、路由注册等）
	Init(r *gin.Engine, db *gorm.DB)
}

// registry 存储所有已注册的模块
var registry []Module

// Register 用于在各个模块的 init() 函数中将自身注册到系统中
func Register(m Module) {
	registry = append(registry, m)
}

// InitAll 遍历并初始化所有已注册的模块
func InitAll(r *gin.Engine, db *gorm.DB) {
	for _, m := range registry {
		m.Init(r, db)
	}
}
