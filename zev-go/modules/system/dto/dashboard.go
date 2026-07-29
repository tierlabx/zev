package dto

type DashboardStatsRes struct {
	UserTotal int64 `json:"userTotal"`
	RoleTotal int64 `json:"roleTotal"`
	MenuTotal int64 `json:"menuTotal"`
	DictTotal int64 `json:"dictTotal"`
}

type DashboardTrendRes struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
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
	MemoryUsage int `json:"memoryUsage"`
	CPUUsage    int `json:"cpuUsage"`
}

type DashboardRes struct {
	Stats      DashboardStatsRes      `json:"stats"`
	Trends     []DashboardTrendRes    `json:"trends"`
	Activities []DashboardActivityRes `json:"activities"`
	Health     DashboardHealthRes     `json:"health"`
}
