package entity

import "time"

// SysOperLog 操作审计日志实体（含链路ID、脱敏参数、UA环境与业务执行结果）
type SysOperLog struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	RequestID    string    `gorm:"type:varchar(64);index;comment:'链路追踪RequestID'" json:"requestId"`
	UserID       uint      `gorm:"default:0;index;comment:'操作人用户ID'" json:"user_id"`
	DeptID       uint      `gorm:"default:0;index;comment:'操作人所属部门ID'" json:"dept_id"`
	Operator     string    `gorm:"type:varchar(50);index;not null;comment:'操作人'" json:"operator"`
	Action       string    `gorm:"type:varchar(50);not null;comment:'操作类型'" json:"action"`
	Module       string    `gorm:"type:varchar(50);index;comment:'操作模块'" json:"module"`
	Method       string    `gorm:"type:varchar(20);comment:'HTTP请求方法'" json:"method"`
	URL          string    `gorm:"type:varchar(255);comment:'请求URL'" json:"url"`
	QueryParams  string    `gorm:"type:text;comment:'脱敏后的Query参数'" json:"queryParams"`
	RequestBody  string    `gorm:"type:text;comment:'脱敏后的请求体'" json:"requestBody"`
	ResponseBody string    `gorm:"type:text;comment:'脱敏后的响应体'" json:"responseBody"`
	IP           string    `gorm:"type:varchar(50);comment:'请求IP'" json:"ip"`
	UserAgent    string    `gorm:"type:varchar(500);comment:'原始User-Agent'" json:"userAgent"`
	Browser      string    `gorm:"type:varchar(64);comment:'浏览器'" json:"browser"`
	OS           string    `gorm:"type:varchar(64);comment:'操作系统'" json:"os"`
	Status       int       `gorm:"type:int;index;comment:'操作状态(0异常 1正常)'" json:"status"`
	ErrorMsg     string    `gorm:"type:text;comment:'错误信息'" json:"errorMsg"`
	Latency      int64     `gorm:"type:bigint;comment:'耗时(ms)'" json:"latency"`
	CreatedAt    time.Time `gorm:"index" json:"createdAt"`
}
