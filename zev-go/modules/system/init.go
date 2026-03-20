package system

import (
	"log"

	"zev-go/modules/system/controller"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func InitModule(r *gin.Engine, db *gorm.DB) {
	err := db.AutoMigrate(&entity.User{}, &entity.Role{})
	if err != nil {
		log.Fatalf("System模块迁移失败: %v", err)
	}

	initDefaultAdmin(db)

	userService := service.NewUserService(db)
	userController := controller.NewUserController(userService)

	api := r.Group("/api/system")
	{
		api.POST("/login", userController.Login)

		userGroup := api.Group("/user")
		{
			userGroup.GET("/list", userController.List)
			userGroup.POST("/create", userController.Create)
			userGroup.PUT("/update", userController.Update)
			userGroup.DELETE("/delete/:id", userController.Delete)
			userGroup.GET("/get/:id", userController.Get)
		}
	}
}

func initDefaultAdmin(db *gorm.DB) {
	var count int64
	db.Model(&entity.User{}).Where("username = ?", "admin").Count(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
		db.Create(&entity.User{
			Username: "admin",
			Password: string(hash),
			Nickname: "超级管理员",
			RoleID:   1,
		})
	}
}
