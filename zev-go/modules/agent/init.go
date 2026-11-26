package agent

import (
	"log/slog"
	"os"

	"zev-go/modules"
	"zev-go/modules/agent/controller"
	agentcrypto "zev-go/modules/agent/engine/crypto"
	agentrt "zev-go/modules/agent/engine/runtime"
	"zev-go/modules/agent/entity"
	"zev-go/modules/agent/service"
	"zev-go/pkg/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AgentModule 业务侧 Agent Harness 子系统模块
type AgentModule struct{}

func init() {
	modules.Register(&AgentModule{})
	modules.RegisterSeed("agent", "modules/agent/seed/seed.json")
}

func (m *AgentModule) Init(r *gin.Engine, db *gorm.DB) {
	// 0. 校验生产环境加密密钥配置
	if err := agentcrypto.ValidateProductionSecret(); err != nil {
		slog.Error("Agent模块安全配置校验失败", "err", err)
		os.Exit(1)
	}

	// 1. 自动迁移 agent 子系统全部数据表
	if err := db.AutoMigrate(entity.AllModels()...); err != nil {
		slog.Error("Agent模块迁移失败", "err", err)
		os.Exit(1)
	}

	// 2. 初始化 Service 与运行时审批协调器
	approvalBroker := agentrt.NewApprovalBroker()
	providerSvc := service.NewProviderService(db)
	agentSvc := service.NewAgentService(db)
	approvalSvc := service.NewApprovalService(db, approvalBroker)
	runSvc := service.NewRunService(db, providerSvc, approvalSvc)
	evalSvc := service.NewEvalService(db, providerSvc, runSvc)
	evalSvc.RecoverStaleRuns()

	// 3. 初始化 Controller 层
	providerCtrl := controller.NewProviderController(providerSvc)
	agentCtrl := controller.NewAgentController(agentSvc)
	runCtrl := controller.NewRunController(runSvc)
	approvalCtrl := controller.NewApprovalController(approvalSvc)
	evalCtrl := controller.NewEvalController(evalSvc)

	// 4. 注册受保护的 /api/agent/* 路由（全量复用 Auth / DataScope / OperLog / RBAC 底座）
	protected := r.Group("/api/agent")
	protected.Use(middleware.AuthMiddleware())
	protected.Use(middleware.DataScopeMiddleware(db))
	protected.Use(middleware.OperLogMiddleware(db))
	protected.Use(middleware.Cors())
	{
		providerGroup := protected.Group("/provider")
		{
			providerGroup.GET("/list", middleware.RequirePermission(db, "agent:provider:list"), providerCtrl.List)
			providerGroup.GET("/options", middleware.RequireAnyPermission(db, "agent:provider:list", "agent:workspace:list", "agent:workspace:create", "agent:workspace:update"), providerCtrl.Options)
			providerGroup.GET("/get/:id", middleware.RequirePermission(db, "agent:provider:list"), providerCtrl.Get)
			providerGroup.POST("/create", middleware.RequirePermission(db, "agent:provider:create"), providerCtrl.Create)
			providerGroup.PUT("/update", middleware.RequirePermission(db, "agent:provider:update"), providerCtrl.Update)
			providerGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "agent:provider:delete"), providerCtrl.Delete)
			providerGroup.POST("/ping/:id", middleware.RequireAnyPermission(db, "agent:provider:list", "agent:provider:update"), providerCtrl.Ping)
		}

		defGroup := protected.Group("/definition")
		{
			defGroup.GET("/list", middleware.RequirePermission(db, "agent:workspace:list"), agentCtrl.List)
			defGroup.GET("/options", middleware.RequireAnyPermission(db, "agent:workspace:list", "agent:playground:run", "agent:traces:list", "agent:evals:list"), agentCtrl.Options)
			defGroup.GET("/get/:id", middleware.RequirePermission(db, "agent:workspace:list"), agentCtrl.Get)
			defGroup.POST("/create", middleware.RequirePermission(db, "agent:workspace:create"), agentCtrl.Create)
			defGroup.PUT("/update", middleware.RequirePermission(db, "agent:workspace:update"), agentCtrl.Update)
			defGroup.DELETE("/delete/:id", middleware.RequirePermission(db, "agent:workspace:delete"), agentCtrl.Delete)
			defGroup.GET("/tools", middleware.RequireAnyPermission(db, "agent:workspace:list", "agent:workspace:create", "agent:workspace:update"), agentCtrl.Tools)
		}

		runGroup := protected.Group("/run")
		{
			runGroup.POST("/stream", middleware.RequirePermission(db, "agent:playground:run"), runCtrl.Stream)
			runGroup.POST("/cancel/:id", middleware.RequirePermission(db, "agent:playground:run"), runCtrl.Cancel)
			runGroup.GET("/list", middleware.RequireAnyPermission(db, "agent:traces:list", "agent:playground:run"), runCtrl.List)
			runGroup.GET("/detail/:id", middleware.RequireAnyPermission(db, "agent:traces:list", "agent:playground:run", "agent:evals:list"), runCtrl.Detail)
			runGroup.GET("/heartbeats", middleware.RequireAnyPermission(db, "agent:traces:list", "agent:playground:run"), runCtrl.Heartbeats)
		}

		approvalGroup := protected.Group("/approval")
		{
			approvalGroup.GET("/list", middleware.RequireAnyPermission(db, "agent:playground:run", "agent:approval:decide", "agent:traces:list"), approvalCtrl.List)
			approvalGroup.GET("/pending-count", middleware.RequireAnyPermission(db, "agent:playground:run", "agent:approval:decide"), approvalCtrl.PendingCount)
			approvalGroup.POST("/decide/:id", middleware.RequirePermission(db, "agent:approval:decide"), approvalCtrl.Decide)
		}

		evalGroup := protected.Group("/eval")
		{
			evalGroup.GET("/dataset/list", middleware.RequirePermission(db, "agent:evals:list"), evalCtrl.ListDatasets)
			evalGroup.POST("/dataset/create", middleware.RequirePermission(db, "agent:evals:manage"), evalCtrl.CreateDataset)
			evalGroup.PUT("/dataset/update", middleware.RequirePermission(db, "agent:evals:manage"), evalCtrl.UpdateDataset)
			evalGroup.DELETE("/dataset/delete/:id", middleware.RequirePermission(db, "agent:evals:manage"), evalCtrl.DeleteDataset)

			evalGroup.GET("/case/list", middleware.RequirePermission(db, "agent:evals:list"), evalCtrl.ListCases)
			evalGroup.POST("/case/create", middleware.RequirePermission(db, "agent:evals:manage"), evalCtrl.CreateCase)
			evalGroup.PUT("/case/update", middleware.RequirePermission(db, "agent:evals:manage"), evalCtrl.UpdateCase)
			evalGroup.DELETE("/case/delete/:id", middleware.RequirePermission(db, "agent:evals:manage"), evalCtrl.DeleteCase)

			evalGroup.POST("/run/execute/:datasetId", middleware.RequirePermission(db, "agent:evals:run"), evalCtrl.ExecuteRun)
			evalGroup.GET("/run/list", middleware.RequirePermission(db, "agent:evals:list"), evalCtrl.ListRuns)
			evalGroup.GET("/run/detail/:id", middleware.RequirePermission(db, "agent:evals:list"), evalCtrl.RunDetail)
		}
	}
}
