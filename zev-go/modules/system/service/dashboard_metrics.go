package service

import (
	"fmt"
	"time"

	"zev-go/modules/system/dto"

	"gorm.io/gorm"
)

// hourBucket 单小时聚合结果
type hourBucket struct {
	Bucket time.Time
	Total  int64
	Failed int64
}

// hourSeries 以 Unix 秒(整点)为键的小时聚合序列
type hourSeries map[int64]hourBucket

// failedByStatus 统计 status=0（失败/异常）的聚合表达式
const failedByStatus = "SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END)"

// hourlyCounts 以小时为粒度聚合一张表在 since 之后的记录数。
// 为什么按小时而不是按天：整点边界在数据库会话时区与 Go 进程时区之间是一致的，
// 由 Go 侧再按本地时区合并成天，可避免两端时区不一致造成的跨日错位；
// 同时一条 GROUP BY 即可同时产出「日趋势」和「24h 心跳」，避免逐天循环查询。
func hourlyCounts(db *gorm.DB, model any, timeCol, failedExpr string, scope func(*gorm.DB) *gorm.DB, since time.Time) hourSeries {
	var rows []hourBucket
	db.Model(model).Scopes(scope).
		Select(fmt.Sprintf("date_trunc('hour', %s) AS bucket, COUNT(*) AS total, %s AS failed", timeCol, failedExpr)).
		Where(timeCol+" >= ?", since).
		Group("bucket").
		Scan(&rows)

	series := make(hourSeries, len(rows))
	for _, r := range rows {
		series[r.Bucket.Unix()] = r
	}
	return series
}

// dailyTotals 将小时序列按本地日期合并，返回 日期(YYYY-MM-DD) -> 聚合值
func (h hourSeries) dailyTotals() map[string]hourBucket {
	days := make(map[string]hourBucket)
	for _, b := range h {
		key := b.Bucket.In(time.Local).Format(time.DateOnly)
		acc := days[key]
		acc.Total += b.Total
		acc.Failed += b.Failed
		days[key] = acc
	}
	return days
}

// buildTrends 生成最近 days 天（含今天）的日趋势
func buildTrends(now time.Time, days int, users, logins, opers hourSeries) []dto.DashboardTrendRes {
	userDays, loginDays, operDays := users.dailyTotals(), logins.dailyTotals(), opers.dailyTotals()
	trends := make([]dto.DashboardTrendRes, 0, days)
	for i := days - 1; i >= 0; i-- {
		date := now.AddDate(0, 0, -i)
		key := date.Format(time.DateOnly)
		trends = append(trends, dto.DashboardTrendRes{
			Date:       date.Format("01-02"),
			Count:      userDays[key].Total,
			Logins:     loginDays[key].Total,
			Operations: operDays[key].Total,
			Failures:   operDays[key].Failed,
		})
	}
	return trends
}

// buildHeartbeats 生成最近 24 小时（含当前小时）的操作心跳
func buildHeartbeats(now time.Time, opers hourSeries) []dto.DashboardHeartbeatRes {
	current := now.Truncate(time.Hour)
	beats := make([]dto.DashboardHeartbeatRes, 0, 24)
	for i := 23; i >= 0; i-- {
		hour := current.Add(-time.Duration(i) * time.Hour)
		b := opers[hour.Unix()]
		beats = append(beats, dto.DashboardHeartbeatRes{
			Hour:   hour.In(time.Local).Format("15:00"),
			Total:  b.Total,
			Failed: b.Failed,
		})
	}
	return beats
}

// startOfDay 返回本地时区当天零点
func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}
