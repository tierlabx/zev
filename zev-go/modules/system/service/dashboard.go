package service

import (
	"time"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"gorm.io/gorm"
)

type DashboardService struct {
	DB *gorm.DB
}

func NewDashboardService(db *gorm.DB) *DashboardService {
	return &DashboardService{DB: db}
}

func (s *DashboardService) GetDashboardData() (*dto.DashboardRes, error) {
	var userTotal, roleTotal, menuTotal, dictTotal int64

	// 1. 统计卡片数据
	s.DB.Model(&entity.User{}).Count(&userTotal)
	s.DB.Model(&entity.Role{}).Count(&roleTotal)
	s.DB.Model(&entity.Menu{}).Count(&menuTotal)
	s.DB.Model(&entity.DictType{}).Count(&dictTotal)

	// 2. 趋势图：最近 7 天的用户活动 (真实查询 sys_users 的 createdAt)
	trends := make([]dto.DashboardTrendRes, 7)
	now := time.Now()
	for i := 6; i >= 0; i-- {
		date := now.AddDate(0, 0, -i)
		dateStr := date.Format("01-02")
		
		var count int64
		start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		end := start.AddDate(0, 0, 1)
		
		s.DB.Model(&entity.User{}).Where("created_at >= ? AND created_at < ?", start, end).Count(&count)
		
		trends[6-i] = dto.DashboardTrendRes{
			Date:  dateStr,
			Count: int(count),
		}
	}

	// 3. 最新活动列表 (真实查询 sys_oper_log 表)
	var logs []entity.SysOperLog
	s.DB.Order("created_at desc").Limit(5).Find(&logs)

	activities := make([]dto.DashboardActivityRes, 0, len(logs))
	for _, l := range logs {
		activities = append(activities, dto.DashboardActivityRes{
			ID:        l.ID,
			Operator:  l.Operator,
			Action:    l.Action + "了" + l.Module,
			CreatedAt: l.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	// 4. 健康指标 (真实数据采集)
	var memoryUsage, cpuUsage int
	if v, err := mem.VirtualMemory(); err == nil {
		memoryUsage = int(v.UsedPercent)
	}
	if percents, err := cpu.Percent(0, false); err == nil && len(percents) > 0 {
		cpuUsage = int(percents[0])
	}
	
	// 测试数据库响应时间
	startPing := time.Now()
	dbPingResult := 100
	if sqlDB, err := s.DB.DB(); err == nil {
		if err := sqlDB.Ping(); err == nil {
			dbPingResult = 100
		} else {
			dbPingResult = 0
		}
	} else {
		dbPingResult = 0
	}
	_ = startPing

	health := dto.DashboardHealthRes{
		APIUsage:    99, // 真实 API 可用率可能需要 Prometheus 等工具，此处用定值或简单计算
		DBResponse:  dbPingResult, // 用连通率替代
		MemoryUsage: memoryUsage,
		CPUUsage:    cpuUsage,
	}

	return &dto.DashboardRes{
		Stats: dto.DashboardStatsRes{
			UserTotal: userTotal,
			RoleTotal: roleTotal,
			MenuTotal: menuTotal,
			DictTotal: dictTotal,
		},
		Trends:     trends,
		Activities: activities,
		Health:     health,
	}, nil
}
