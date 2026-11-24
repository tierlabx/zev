package dto

// OperLogListReq 操作日志分页筛选请求
type OperLogListReq struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"pageSize"`
	Operator  string `form:"operator"`
	Module    string `form:"module"`
	Action    string `form:"action"`
	Method    string `form:"method"`
	Status    *int   `form:"status"`
	RequestID string `form:"requestId"`
	StartTime string `form:"startTime"`
	EndTime   string `form:"endTime"`
}

// LoginLogListReq 登录日志分页筛选请求
type LoginLogListReq struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"pageSize"`
	Username  string `form:"username"`
	IP        string `form:"ip"`
	Status    *int   `form:"status"`
	RequestID string `form:"requestId"`
	StartTime string `form:"startTime"`
	EndTime   string `form:"endTime"`
}

// BatchDeleteLogReq 批量删除日志请求
type BatchDeleteLogReq struct {
	IDs []uint `json:"ids" binding:"required,min=1"`
}

// LogStatsRes 日志审计今日概览统计响应
type LogStatsRes struct {
	OperTotal      int64 `json:"operTotal"`
	OperToday      int64 `json:"operToday"`
	OperErrorToday int64 `json:"operErrorToday"`
	LoginToday     int64 `json:"loginToday"`
	LoginFailToday int64 `json:"loginFailToday"`
}

// LogPageRes 日志统一分页响应结构
type LogPageRes[T any] struct {
	List     []T   `json:"list"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}
