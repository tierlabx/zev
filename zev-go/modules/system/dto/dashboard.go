package dto

type DashboardStatsRes struct {
	UserTotal int64 `json:"userTotal"`
	RoleTotal int64 `json:"roleTotal"`
	MenuTotal int64 `json:"menuTotal"`
	DictTotal int64 `json:"dictTotal"`
}

// DashboardTrendRes 按天聚合的趋势点（共 14 天，前 7 天用于计算环比）
type DashboardTrendRes struct {
	Date       string `json:"date"`
	Count      int64  `json:"count"`      // 新增用户数
	Logins     int64  `json:"logins"`     // 登录次数
	Operations int64  `json:"operations"` // 操作次数
	Failures   int64  `json:"failures"`   // 异常操作次数
}

// DashboardHeartbeatRes 近 24 小时按小时聚合的操作心跳，用于 Tracker 状态条
type DashboardHeartbeatRes struct {
	Hour   string `json:"hour"`
	Total  int64  `json:"total"`
	Failed int64  `json:"failed"`
}

// DashboardModuleRes 近 7 天操作模块分布
type DashboardModuleRes struct {
	Module string `json:"module"`
	Count  int64  `json:"count"`
}

type DashboardActivityRes struct {
	ID        uint   `json:"id"`
	Operator  string `json:"operator"`
	Action    string `json:"action"`
	CreatedAt string `json:"createdAt"`
}

type DashboardHealthRes struct {
	APIUsage    int `json:"apiUsage"`
	DBResponse  int `json:"dbResponse"`
	DBLatency   int `json:"dbLatency"` // 数据库 Ping 耗时(ms)
	MemoryUsage int `json:"memoryUsage"`
	CPUUsage    int `json:"cpuUsage"`
}

type DashboardRes struct {
	Stats      DashboardStatsRes       `json:"stats"`
	Trends     []DashboardTrendRes     `json:"trends"`
	Heartbeats []DashboardHeartbeatRes `json:"heartbeats"`
	Modules    []DashboardModuleRes    `json:"modules"`
	Activities []DashboardActivityRes  `json:"activities"`
	Health     DashboardHealthRes      `json:"health"`
}
