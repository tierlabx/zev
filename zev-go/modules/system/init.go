package system

import (
	"log/slog"
	"os"

	"zev-go/modules/system/controller"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/middleware"
	"zev-go/modules"
	"zev-go/modules/system/seed"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"
)
type SystemModule struct{}

func init() {
	modules.Register(&SystemModule{})
}

func (m *SystemModule) Init(r *gin.Engine, db *gorm.DB) {
	models := entity.AllModels()

	// 1. 自动迁移所有系统模块实体
	err := db.AutoMigrate(models...)
	if err != nil {
		slog.Error("System模块迁移失败", "err", err)
		os.Exit(1)
	}

	// 2. 使用 seed.json 初始化基础数据
	seed.Run(db, "modules/system/seed/seed.json")

	// 3. 初始化 Service 层
	roleService := service.NewRoleService(db)
	menuService := service.NewMenuService(db)
	userService := service.NewUserService(db, roleService, menuService)
	dictTypeService := service.NewDictTypeService(db)
	dictDataService := service.NewDictDataService(db)
	dashboardService := service.NewDashboardService(db)
	noticeService := service.NewNoticeService(db)

	// 4. 初始化 Controller 层
	openController := controller.NewOpenController(db)
	userController := controller.NewUserController(userService, roleService, menuService)
	roleController := controller.NewRoleController(roleService)
	menuController := controller.NewMenuController(menuService)
	dictTypeController := controller.NewDictTypeController(dictTypeService)
	dictDataController := controller.NewDictDataController(dictDataService)
	dashboardController := controller.NewDashboardController(dashboardService)
	noticeController := controller.NewNoticeController(noticeService)



	{
		r.GET("/api/ping", openController.PingHandler)
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}
	// 6. 注册 HTTP API 路由
	api := r.Group("/api/system")
	{
		api.POST("/login", userController.Login)

		protected := api.Group("")
		// 认证中间件
		protected.Use(middleware.AuthMiddleware())
		// 操作日志中间件 (拦截修改/删除操作)
		protected.Use(middleware.OperLogMiddleware(db))
		// 跨域处理中间件
		protected.Use(middleware.Cors())
		{
			// Dashboard 路由
			dashboardGroup := protected.Group("/dashboard")
			{
				dashboardGroup.GET("/stats", dashboardController.GetStats)
			}

			// 用户路由
			userGroup := protected.Group("/user")
			{
				userGroup.GET("/info", userController.UserInfo)
				userGroup.GET("/list", middleware.RequirePermission(db, "system:user:list"), userController.List)
				userGroup.POST("/create", middleware.RequirePermission(db, "system:user:create"), userController.Create)
				userGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:user:delete"), userController.Delete)
				userGroup.PUT("/update", middleware.RequirePermission(db, "system:user:update"), userController.Update)
				userGroup.GET("/get/:id", middleware.RequirePermission(db, "system:user:list"), userController.Get)
				userGroup.POST("/role/:id", middleware.RequirePermission(db, "system:user:assign"), userController.AssignRole)
				userGroup.POST("/logout", userController.Logout)
			}

			// 角色路由
			roleGroup := protected.Group("/role")
			{
				roleGroup.GET("/list", middleware.RequirePermission(db, "system:role:list"), roleController.List)
				roleGroup.POST("/create", middleware.RequirePermission(db, "system:role:create"), roleController.Create)
				roleGroup.PUT("/update", middleware.RequirePermission(db, "system:role:update"), roleController.Update)
				roleGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:role:delete"), roleController.Delete)
				roleGroup.GET("/get/:id", middleware.RequirePermission(db, "system:role:list"), roleController.Get)
				roleGroup.POST("/menus/:id", middleware.RequirePermission(db, "system:role:assign"), roleController.AssignMenus)
				roleGroup.GET("/menus/:id", middleware.RequirePermission(db, "system:role:list"), roleController.GetRoleMenus)
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

			// 系统通知路由
			noticeGroup := protected.Group("/notice")
			{
				noticeGroup.GET("/list", noticeController.GetUnreadList)
				noticeGroup.PUT("/read/:id", noticeController.MarkAsRead)
			}
		}
	}
}
