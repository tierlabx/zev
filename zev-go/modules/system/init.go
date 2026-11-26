package system

import (
	"log/slog"
	"os"

	"zev-go/modules"
	"zev-go/modules/system/controller"
	"zev-go/modules/system/entity"
	"zev-go/modules/system/seed"
	"zev-go/modules/system/service"
	"zev-go/pkg/captcha"
	"zev-go/pkg/middleware"
	"zev-go/pkg/swagger"

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

	// 2. 使用 seed.json 初始化基础数据与幂等升级回填
	seed.Run(db, "modules/system/seed/seed.json")

	// 3. 初始化 Service 层
	deptService := service.NewDeptService(db)
	roleService := service.NewRoleService(db)
	menuService := service.NewMenuService(db)
	captchaManager := captcha.NewDefault()
	userService := service.NewUserService(db, roleService, menuService, deptService, captchaManager)
	dictTypeService := service.NewDictTypeService(db)
	dictDataService := service.NewDictDataService(db)
	dashboardService := service.NewDashboardService(db)
	noticeService := service.NewNoticeService(db)
	logService := service.NewLogService(db)

	// 4. 初始化 Controller 层
	openController := controller.NewOpenController()
	deptController := controller.NewDeptController(deptService)
	userController := controller.NewUserController(userService, roleService, menuService)
	roleController := controller.NewRoleController(roleService)
	menuController := controller.NewMenuController(menuService)
	dictTypeController := controller.NewDictTypeController(dictTypeService)
	dictDataController := controller.NewDictDataController(dictDataService)
	dashboardController := controller.NewDashboardController(dashboardService)
	noticeController := controller.NewNoticeController(noticeService)
	logController := controller.NewLogController(logService)

	{
		r.GET("/api/ping", openController.PingHandler)
		// 生产模式默认关闭 Swagger 路由暴露，可通过 ENABLE_SWAGGER=true 按需开启
		if swagger.IsEnabled() {
			r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
		}
	}

	// 6. 注册 HTTP API 路由
	api := r.Group("/api/system")
	{
		api.GET("/captcha", userController.Captcha)
		api.POST("/login", userController.Login)

		protected := api.Group("")
		// 认证中间件
		protected.Use(middleware.AuthMiddleware())
		// 数据权限上下文注入中间件（拦截被禁用或无效账号）
		protected.Use(middleware.DataScopeMiddleware(db))
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

			// 部门路由
			deptGroup := protected.Group("/dept")
			{
				deptGroup.GET("/tree", middleware.RequireAnyPermission(db, "system:dept:list", "system:user:list"), deptController.Tree)
				deptGroup.GET("/options", middleware.RequireAnyPermission(db, "system:dept:list", "system:role:list", "system:role:datascope", "system:user:list"), deptController.OptionsTree)
				deptGroup.GET("/list", middleware.RequirePermission(db, "system:dept:list"), deptController.List)
				deptGroup.POST("/create", middleware.RequirePermission(db, "system:dept:create"), deptController.Create)
				deptGroup.PUT("/update", middleware.RequirePermission(db, "system:dept:update"), deptController.Update)
				deptGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:dept:delete"), deptController.Delete)
				deptGroup.GET("/get/:id", middleware.RequirePermission(db, "system:dept:list"), deptController.Get)
			}

			// 用户路由
			userGroup := protected.Group("/user")
			{
				userGroup.GET("/info", userController.UserInfo)
				userGroup.PUT("/profile", userController.UpdateProfile)
				userGroup.PUT("/password", userController.ChangePassword)
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
				roleGroup.GET("/list", middleware.RequireAnyPermission(db, "system:role:list", "system:user:list", "system:user:assign"), roleController.List)
				roleGroup.POST("/create", middleware.RequirePermission(db, "system:role:create"), roleController.Create)
				roleGroup.PUT("/update", middleware.RequirePermission(db, "system:role:update"), roleController.Update)
				roleGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:role:delete"), roleController.Delete)
				roleGroup.GET("/get/:id", middleware.RequirePermission(db, "system:role:list"), roleController.Get)
				roleGroup.POST("/menus/:id", middleware.RequirePermission(db, "system:role:assign"), roleController.AssignMenus)
				roleGroup.GET("/menus/:id", middleware.RequirePermission(db, "system:role:list"), roleController.GetRoleMenus)
				roleGroup.GET("/datascope/:id", middleware.RequireAnyPermission(db, "system:role:list", "system:role:datascope"), roleController.GetDataScope)
				roleGroup.PUT("/datascope/:id", middleware.RequirePermission(db, "system:role:datascope"), roleController.AssignDataScope)
			}

			// 菜单路由
			menuGroup := protected.Group("/menu")
			{
				menuGroup.GET("/list", middleware.RequirePermission(db, "system:menu:list"), menuController.List)
				menuGroup.POST("/create", middleware.RequirePermission(db, "system:menu:create"), menuController.Create)
				menuGroup.PUT("/update", middleware.RequirePermission(db, "system:menu:update"), menuController.Update)
				menuGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "system:menu:delete"), menuController.Delete)
				menuGroup.GET("/get/:id", middleware.RequirePermission(db, "system:menu:list"), menuController.Get)
				menuGroup.GET("/tree", middleware.RequireAnyPermission(db, "system:menu:list", "system:role:assign"), menuController.Tree)
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

			// 系统通知与消息中心路由
			noticeGroup := protected.Group("/notice")
			{
				// 全员个人收件箱与实时推送接口
				noticeGroup.GET("/stream", noticeController.Stream)
				noticeGroup.GET("/unread-count", noticeController.GetUnreadCount)
				noticeGroup.GET("/list", noticeController.GetUnreadList)
				noticeGroup.GET("/my", noticeController.ListMyNotices)
				noticeGroup.GET("/my/:id", noticeController.GetMyNoticeDetail)
				noticeGroup.PUT("/read/:id", noticeController.MarkAsRead)
				noticeGroup.PUT("/unread/:id", noticeController.MarkAsUnread)
				noticeGroup.PUT("/read-all", noticeController.MarkAllAsRead)
				noticeGroup.DELETE("/my/delete", noticeController.DeleteMyNotices)
				noticeGroup.DELETE("/my/clear-read", noticeController.ClearReadNotices)
				noticeGroup.GET("/receivers", noticeController.ListReceivers)
				noticeGroup.POST("/direct", noticeController.SendDirectMessage)

				// 消息管理控制台接口 (RBAC + DataScope)
				noticeGroup.GET("/manage/list", middleware.RequirePermission(db, "system:notice:list"), noticeController.ListManageNotices)
				noticeGroup.GET("/manage/get/:id", middleware.RequirePermission(db, "system:notice:list"), noticeController.GetManageNotice)
				noticeGroup.POST("/create", middleware.RequireAnyPermission(db, "system:notice:create", "system:notice:send"), noticeController.CreateNotice)
				noticeGroup.PUT("/update", middleware.RequirePermission(db, "system:notice:update"), noticeController.UpdateNotice)
				noticeGroup.POST("/publish/:id", middleware.RequireAnyPermission(db, "system:notice:send", "system:notice:update"), noticeController.PublishNotice)
				noticeGroup.POST("/revoke/:id", middleware.RequireAnyPermission(db, "system:notice:update", "system:notice:send"), noticeController.RevokeNotice)
				noticeGroup.DELETE("/delete", middleware.RequirePermission(db, "system:notice:delete"), noticeController.DeleteNotices)
			}

			// 日志审计路由
			logGroup := protected.Group("/log")
			{
				logGroup.GET("/stats", middleware.RequireAnyPermission(db, "system:operlog:list", "system:loginlog:list"), logController.GetStats)
				logGroup.GET("/oper/list", middleware.RequirePermission(db, "system:operlog:list"), logController.ListOperLogs)
				logGroup.GET("/oper/get/:id", middleware.RequirePermission(db, "system:operlog:list"), logController.GetOperLog)
				logGroup.DELETE("/oper/delete", middleware.RequirePermission(db, "system:operlog:delete"), logController.DeleteOperLogs)
				logGroup.POST("/oper/clear", middleware.RequirePermission(db, "system:operlog:delete"), logController.ClearOperLogs)
				logGroup.GET("/oper/export", middleware.RequirePermission(db, "system:operlog:export"), logController.ExportOperLogs)
				logGroup.GET("/login/list", middleware.RequirePermission(db, "system:loginlog:list"), logController.ListLoginLogs)
				logGroup.DELETE("/login/delete", middleware.RequirePermission(db, "system:loginlog:delete"), logController.DeleteLoginLogs)
				logGroup.POST("/login/clear", middleware.RequirePermission(db, "system:loginlog:delete"), logController.ClearLoginLogs)
				logGroup.GET("/login/export", middleware.RequirePermission(db, "system:loginlog:export"), logController.ExportLoginLogs)
			}
		}
	}
}
