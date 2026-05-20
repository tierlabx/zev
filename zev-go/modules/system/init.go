package system

import (
	"log"

	"zev-go/modules/system/controller"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
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
	seed.Run(db, "seed.json")

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

		// 用户路由
		userGroup := api.Group("/user")
		{
			userGroup.GET("/list", userController.List)
			userGroup.POST("/create", userController.Create)
			userGroup.PUT("/update", userController.Update)
			userGroup.DELETE("/delete/:id", userController.Delete)
			userGroup.GET("/get/:id", userController.Get)
		}

		// 角色路由
		roleGroup := api.Group("/role")
		{
			roleGroup.GET("/list", roleController.List)
			roleGroup.POST("/create", roleController.Create)
			roleGroup.PUT("/update", roleController.Update)
			roleGroup.DELETE("/delete/:id", roleController.Delete)
			roleGroup.GET("/get/:id", roleController.Get)
		}

		// 菜单路由
		menuGroup := api.Group("/menu")
		{
			menuGroup.GET("/list", menuController.List)
			menuGroup.POST("/create", menuController.Create)
			menuGroup.PUT("/update", menuController.Update)
			menuGroup.DELETE("/delete/:id", menuController.Delete)
			menuGroup.GET("/get/:id", menuController.Get)
			menuGroup.GET("/tree", menuController.Tree)
		}

		// 字典类型路由
		dictTypeGroup := api.Group("/dict/type")
		{
			dictTypeGroup.GET("/list", dictTypeController.List)
			dictTypeGroup.POST("/create", dictTypeController.Create)
			dictTypeGroup.PUT("/update", dictTypeController.Update)
			dictTypeGroup.DELETE("/delete/:id", dictTypeController.Delete)
			dictTypeGroup.GET("/get/:id", dictTypeController.Get)
		}

		// 字典数据路由
		dictDataGroup := api.Group("/dict/data")
		{
			dictDataGroup.GET("/list", dictDataController.List)
			dictDataGroup.POST("/create", dictDataController.Create)
			dictDataGroup.PUT("/update", dictDataController.Update)
			dictDataGroup.DELETE("/delete/:id", dictDataController.Delete)
			dictDataGroup.GET("/get/:id", dictDataController.Get)
		}
	}
}
