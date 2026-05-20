package system

import (
	"log"

	"zev-go/modules/system/controller"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/middleware"
	"zev-go/pkg/seed"
	"zev-go/pkg/swagger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitModule(r *gin.Engine, db *gorm.DB) {
	// 1. 自动迁移所有系统模块实体
	err := db.AutoMigrate(
		&entity.User{},
		&entity.Role{},
		&entity.Menu{},
		&entity.DictType{},
		&entity.DictData{},
	)
	if err != nil {
		log.Fatalf("System模块迁移失败: %v", err)
	}

	// 2. 使用 seed.json 初始化基础数据
	seed.Run(db, "pkg/seed/seed.json")

	// 3. 初始化 Service 层
	userService := service.NewUserService(db)
	roleService := service.NewRoleService(db)
	menuService := service.NewMenuService(db)
	dictTypeService := service.NewDictTypeService(db)
	dictDataService := service.NewDictDataService(db)

	// 4. 初始化 Controller 层
	userController := controller.NewUserController(userService)
	roleController := controller.NewRoleController(roleService)
	menuController := controller.NewMenuController(menuService)
	dictTypeController := controller.NewDictTypeController(dictTypeService)
	dictDataController := controller.NewDictDataController(dictDataService)

	// 5. 自动注册 Swagger 路由
	swagger.RegisterCRUD("系统管理-用户", "/api/system/user", entity.User{})
	swagger.RegisterCRUD("系统管理-角色", "/api/system/role", entity.Role{})
	swagger.RegisterCRUD("系统管理-菜单", "/api/system/menu", entity.Menu{})
	swagger.RegisterCRUD("系统管理-字典类型", "/api/system/dict/type", entity.DictType{})
	swagger.RegisterCRUD("系统管理-字典数据", "/api/system/dict/data", entity.DictData{})

	// 6. 注册 HTTP API 路由
	api := r.Group("/api/system")
	{
		api.POST("/login", userController.Login)

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// 用户路由
			userGroup := protected.Group("/user")
			{
				userGroup.GET("/list", middleware.RequirePermission(db, "system:user:list"), userController.List)
				userGroup.POST("/create", middleware.RequirePermission(db, "system:user:create"), userController.Create)
				userGroup.PUT("/update", middleware.RequirePermission(db, "system:user:update"), userController.Update)
				userGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:user:delete"), userController.Delete)
				userGroup.GET("/get/:id", middleware.RequirePermission(db, "system:user:list"), userController.Get)
			}

			// 角色路由
			roleGroup := protected.Group("/role")
			{
				roleGroup.GET("/list", middleware.RequirePermission(db, "system:role:list"), roleController.List)
				roleGroup.POST("/create", middleware.RequirePermission(db, "system:role:create"), roleController.Create)
				roleGroup.PUT("/update", middleware.RequirePermission(db, "system:role:update"), roleController.Update)
				roleGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:role:delete"), roleController.Delete)
				roleGroup.GET("/get/:id", middleware.RequirePermission(db, "system:role:list"), roleController.Get)
			}

			// 菜单路由
			menuGroup := protected.Group("/menu")
			{
				menuGroup.GET("/list", middleware.RequirePermission(db, "system:menu:list"), menuController.List)
				menuGroup.POST("/create", middleware.RequirePermission(db, "system:menu:create"), menuController.Create)
				menuGroup.PUT("/update", middleware.RequirePermission(db, "system:menu:update"), menuController.Update)
				menuGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:menu:delete"), menuController.Delete)
				menuGroup.GET("/get/:id", middleware.RequirePermission(db, "system:menu:list"), menuController.Get)
				menuGroup.GET("/tree", middleware.RequirePermission(db, "system:menu:list"), menuController.Tree)
			}

			// 字典类型路由
			dictTypeGroup := protected.Group("/dict/type")
			{
				dictTypeGroup.GET("/list", middleware.RequirePermission(db, "system:dict:list"), dictTypeController.List)
				dictTypeGroup.POST("/create", middleware.RequirePermission(db, "system:dict:create"), dictTypeController.Create)
				dictTypeGroup.PUT("/update", middleware.RequirePermission(db, "system:dict:update"), dictTypeController.Update)
				dictTypeGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:dict:delete"), dictTypeController.Delete)
				dictTypeGroup.GET("/get/:id", middleware.RequirePermission(db, "system:dict:list"), dictTypeController.Get)
			}

			// 字典数据路由
			dictDataGroup := protected.Group("/dict/data")
			{
				dictDataGroup.GET("/list", middleware.RequirePermission(db, "system:dict:list"), dictDataController.List)
				dictDataGroup.POST("/create", middleware.RequirePermission(db, "system:dict:create"), dictDataController.Create)
				dictDataGroup.PUT("/update", middleware.RequirePermission(db, "system:dict:update"), dictDataController.Update)
				dictDataGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:dict:delete"), dictDataController.Delete)
				dictDataGroup.GET("/get/:id", middleware.RequirePermission(db, "system:dict:list"), dictDataController.Get)
			}
		}
	}
}
