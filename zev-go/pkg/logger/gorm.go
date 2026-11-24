package logger

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

const maxSQLLogBytes = 2048

// GormLogger 自定义 GORM 日志器，统一接入 slog 并支持慢 SQL 与错误追踪
type GormLogger struct {
	logLevel                  gormlogger.LogLevel
	slowThreshold             time.Duration
	ignoreRecordNotFoundError bool
}

// NewGormLogger 创建 GORM 日志器；默认 Warn 级别仅打印慢 SQL 与异常 SQL，Debug 级别打印全部 SQL
func NewGormLogger(slowThreshold time.Duration, appLogLevel string) *GormLogger {
	gormLevel := gormlogger.Warn
	switch strings.ToLower(strings.TrimSpace(appLogLevel)) {
	case "debug":
		gormLevel = gormlogger.Info
	case "error":
		gormLevel = gormlogger.Error
	}
	return &GormLogger{
		logLevel:                  gormLevel,
		slowThreshold:             slowThreshold,
		ignoreRecordNotFoundError: true,
	}
}

func (l *GormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	cp := *l
	cp.logLevel = level
	return &cp
}

func (l *GormLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	if l.logLevel >= gormlogger.Info {
		FromContext(ctx).Info(fmt.Sprintf(msg, data...))
	}
}

func (l *GormLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	if l.logLevel >= gormlogger.Warn {
		FromContext(ctx).Warn(fmt.Sprintf(msg, data...))
	}
}

func (l *GormLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	if l.logLevel >= gormlogger.Error {
		FromContext(ctx).Error(fmt.Sprintf(msg, data...))
	}
}

func (l *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	if l.logLevel <= gormlogger.Silent {
		return
	}

	elapsed := time.Since(begin)
	lgr := FromContext(ctx)

	switch {
	case err != nil && l.logLevel >= gormlogger.Error && (!errors.Is(err, gorm.ErrRecordNotFound) || !l.ignoreRecordNotFoundError):
		sql, rows := fc()
		lgr.Error("SQL执行失败",
			"latency_ms", elapsed.Milliseconds(),
			"rows", rows,
			"sql", TruncateString(sql, maxSQLLogBytes),
			"err", err,
		)
	case l.slowThreshold > 0 && elapsed > l.slowThreshold && l.logLevel >= gormlogger.Warn:
		sql, rows := fc()
		lgr.Warn("慢SQL告警",
			"latency_ms", elapsed.Milliseconds(),
			"threshold_ms", l.slowThreshold.Milliseconds(),
			"rows", rows,
			"sql", TruncateString(sql, maxSQLLogBytes),
		)
	case l.logLevel >= gormlogger.Info:
		sql, rows := fc()
		lgr.Debug("SQL执行记录",
			"latency_ms", elapsed.Milliseconds(),
			"rows", rows,
			"sql", TruncateString(sql, maxSQLLogBytes),
		)
	}
}
