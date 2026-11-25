package service

import (
	"time"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/datascope"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"gorm.io/gorm"
)

// trendDays 趋势天数：取 14 天，前端用前 7 天与后 7 天计算环比
const trendDays = 14

type DashboardService struct {
	DB *gorm.DB
}

func NewDashboardService(db *gorm.DB) *DashboardService {
	return &DashboardService{DB: db}
}

func (s *DashboardService) GetDashboardData(scope *datascope.Scope) (*dto.DashboardRes, error) {
	var userTotal, roleTotal, menuTotal, dictTotal int64

	userScope := datascope.Apply(scope, datascope.Options{
		DeptColumn: "dept_id",
		UserColumn: "id",
	})
	// 登录/操作日志均按操作人及其所属部门进行数据范围隔离
	logScope := datascope.Apply(scope, datascope.Options{
		DeptColumn: "dept_id",
		UserColumn: "user_id",
	})

	// 1. 统计卡片数据（用户数按数据范围隔离）
	s.DB.Model(&entity.User{}).Scopes(userScope).Count(&userTotal)
	s.DB.Model(&entity.Role{}).Count(&roleTotal)
	s.DB.Model(&entity.Menu{}).Count(&menuTotal)
	s.DB.Model(&entity.DictType{}).Count(&dictTotal)

	// 2. 趋势与心跳：每张表一条按小时聚合的 SQL，Go 侧再折算成日趋势和 24h 心跳
	now := time.Now()
	since := startOfDay(now.AddDate(0, 0, -(trendDays - 1)))
	users := hourlyCounts(s.DB, &entity.User{}, "created_at", "0", userScope, since)
	logins := hourlyCounts(s.DB, &entity.SysLoginLog{}, "login_time", failedByStatus, logScope, since)
	opers := hourlyCounts(s.DB, &entity.SysOperLog{}, "created_at", failedByStatus, logScope, since)

	// 3. 近 7 天操作模块分布（Top 6）
	modules := make([]dto.DashboardModuleRes, 0, 6)
	s.DB.Model(&entity.SysOperLog{}).Scopes(logScope).
		Select("module, COUNT(*) AS count").
		Where("created_at >= ? AND module <> ''", startOfDay(now.AddDate(0, 0, -6))).
		Group("module").
		Order("count DESC").
		Limit(6).
		Scan(&modules)

	// 4. 最新活动列表
	var logs []entity.SysOperLog
	s.DB.Model(&entity.SysOperLog{}).Scopes(logScope).Order("created_at desc").Limit(5).Find(&logs)

	activities := make([]dto.DashboardActivityRes, 0, len(logs))
	for _, l := range logs {
		activities = append(activities, dto.DashboardActivityRes{
			ID:        l.ID,
			Operator:  l.Operator,
			Action:    l.Action + "了" + l.Module,
			CreatedAt: l.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return &dto.DashboardRes{
		Stats: dto.DashboardStatsRes{
			UserTotal: userTotal,
			RoleTotal: roleTotal,
			MenuTotal: menuTotal,
			DictTotal: dictTotal,
		},
		Trends:     buildTrends(now, trendDays, users, logins, opers),
		Heartbeats: buildHeartbeats(now, opers),
		Modules:    modules,
		Activities: activities,
		Health:     s.collectHealth(),
	}, nil
}

// collectHealth 采集主机与数据库的实时健康指标
func (s *DashboardService) collectHealth() dto.DashboardHealthRes {
	var memoryUsage, cpuUsage int
	if v, err := mem.VirtualMemory(); err == nil {
		memoryUsage = int(v.UsedPercent)
	}
	if percents, err := cpu.Percent(0, false); err == nil && len(percents) > 0 {
		cpuUsage = int(percents[0])
	}

	// 数据库连通率 + Ping 耗时；连接失败时连通率记 0
	dbResponse, dbLatency := 0, 0
	if sqlDB, err := s.DB.DB(); err == nil {
		start := time.Now()
		if err := sqlDB.Ping(); err == nil {
			dbResponse = 100
			dbLatency = int(time.Since(start).Milliseconds())
		}
	}

	return dto.DashboardHealthRes{
		APIUsage:    99, // 真实 API 可用率需借助 Prometheus 等工具，此处保留定值
		DBResponse:  dbResponse,
		DBLatency:   dbLatency,
		MemoryUsage: memoryUsage,
		CPUUsage:    cpuUsage,
	}
}
