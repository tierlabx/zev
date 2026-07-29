package service

import (
	"time"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"

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

	// 2. 趋势图：最近 7 天的用户活动 (由于没有日志表，这里模拟最近7天内每天的新增用户数作为活跃趋势)
	// 在生产环境中应查询审计日志表或登录日志表
	trends := make([]dto.DashboardTrendRes, 7)
	now := time.Now()
	for i := 6; i >= 0; i-- {
		date := now.AddDate(0, 0, -i)
		dateStr := date.Format("01-02")
		
		var count int64
		// 获取当天起始时间和结束时间
		start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		end := start.AddDate(0, 0, 1)
		
		s.DB.Model(&entity.User{}).Where("created_at >= ? AND created_at < ?", start, end).Count(&count)
		
		trends[6-i] = dto.DashboardTrendRes{
			Date:  dateStr,
			Count: int(count),
		}
	}

	// 3. 最新活动列表 (由于没有操作日志表，我们查询最新创建/更新的 5 个用户作为活动)
	var latestUsers []entity.User
	s.DB.Order("updated_at desc").Limit(5).Find(&latestUsers)

	activities := make([]dto.DashboardActivityRes, 0, len(latestUsers))
	for _, u := range latestUsers {
		action := "更新了信息"
		if u.CreatedAt == u.UpdatedAt {
			action = "新注册"
		}
		activities = append(activities, dto.DashboardActivityRes{
			ID:        u.ID,
			Operator:  u.Username,
			Action:    action,
			CreatedAt: u.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	// 4. 健康指标 (真实数据可能需要采集，这里我们简单读取一些基础指标并使用随机波动或定值)
	health := dto.DashboardHealthRes{
		APIUsage:    99,
		DBResponse:  95,
		MemoryUsage: 45,
		CPUUsage:    20,
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
