package service

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"strings"
	"time"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/datascope"

	"gorm.io/gorm"
)

const (
	defaultLogPageSize = 20
	maxLogPageSize     = 100
	maxLogExportRows   = 5000
)

// LogService 日志审计服务，统一收口操作日志、登录日志的数据范围过滤、删除清空与安全导出
type LogService struct {
	DB *gorm.DB
}

func NewLogService(db *gorm.DB) *LogService {
	return &LogService{DB: db}
}

func normalizePagination(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = defaultLogPageSize
	} else if pageSize > maxLogPageSize {
		pageSize = maxLogPageSize
	}
	return page, pageSize
}

func parseFilterTime(raw string, endOfDay bool) (*time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}
	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02",
	}
	for _, layout := range layouts {
		t, err := time.ParseInLocation(layout, trimmed, time.Local)
		if err == nil {
			if layout == "2006-01-02" && endOfDay {
				t = t.Add(24*time.Hour - time.Nanosecond)
			}
			return &t, nil
		}
	}
	return nil, errors.New("时间格式无效，请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss")
}

func (s *LogService) buildOperLogQuery(scope *datascope.Scope, req dto.OperLogListReq) (*gorm.DB, error) {
	query := s.DB.Model(&entity.SysOperLog{}).
		Scopes(datascope.Apply(scope, datascope.Options{DeptColumn: "dept_id", UserColumn: "user_id"}))

	if operator := strings.TrimSpace(req.Operator); operator != "" {
		query = query.Where("operator LIKE ?", "%"+operator+"%")
	}
	if module := strings.TrimSpace(req.Module); module != "" {
		query = query.Where("module = ?", module)
	}
	if action := strings.TrimSpace(req.Action); action != "" {
		query = query.Where("action LIKE ?", "%"+action+"%")
	}
	if method := strings.ToUpper(strings.TrimSpace(req.Method)); method != "" {
		query = query.Where("method = ?", method)
	}
	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}
	if rid := strings.TrimSpace(req.RequestID); rid != "" {
		query = query.Where("request_id = ?", rid)
	}

	startAt, err := parseFilterTime(req.StartTime, false)
	if err != nil {
		return nil, err
	}
	if startAt != nil {
		query = query.Where("created_at >= ?", *startAt)
	}

	endAt, err := parseFilterTime(req.EndTime, true)
	if err != nil {
		return nil, err
	}
	if endAt != nil {
		query = query.Where("created_at <= ?", *endAt)
	}

	return query, nil
}

func (s *LogService) buildLoginLogQuery(scope *datascope.Scope, req dto.LoginLogListReq) (*gorm.DB, error) {
	query := s.DB.Model(&entity.SysLoginLog{}).
		Scopes(datascope.Apply(scope, datascope.Options{DeptColumn: "dept_id", UserColumn: "user_id"}))

	if username := strings.TrimSpace(req.Username); username != "" {
		query = query.Where("username LIKE ?", "%"+username+"%")
	}
	if ip := strings.TrimSpace(req.IP); ip != "" {
		query = query.Where("ip LIKE ?", "%"+ip+"%")
	}
	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}
	if rid := strings.TrimSpace(req.RequestID); rid != "" {
		query = query.Where("request_id = ?", rid)
	}

	startAt, err := parseFilterTime(req.StartTime, false)
	if err != nil {
		return nil, err
	}
	if startAt != nil {
		query = query.Where("login_time >= ?", *startAt)
	}

	endAt, err := parseFilterTime(req.EndTime, true)
	if err != nil {
		return nil, err
	}
	if endAt != nil {
		query = query.Where("login_time <= ?", *endAt)
	}

	return query, nil
}

// GetStats 获取数据权限范围内的今日及总计日志概览
func (s *LogService) GetStats(scope *datascope.Scope) (*dto.LogStatsRes, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dsOpt := datascope.Options{DeptColumn: "dept_id", UserColumn: "user_id"}

	var res dto.LogStatsRes
	if err := s.DB.Model(&entity.SysOperLog{}).
		Scopes(datascope.Apply(scope, dsOpt)).
		Count(&res.OperTotal).Error; err != nil {
		return nil, err
	}
	if err := s.DB.Model(&entity.SysOperLog{}).
		Scopes(datascope.Apply(scope, dsOpt)).
		Where("created_at >= ?", todayStart).
		Count(&res.OperToday).Error; err != nil {
		return nil, err
	}
	if err := s.DB.Model(&entity.SysOperLog{}).
		Scopes(datascope.Apply(scope, dsOpt)).
		Where("created_at >= ? AND status = ?", todayStart, 0).
		Count(&res.OperErrorToday).Error; err != nil {
		return nil, err
	}
	if err := s.DB.Model(&entity.SysLoginLog{}).
		Scopes(datascope.Apply(scope, dsOpt)).
		Where("login_time >= ?", todayStart).
		Count(&res.LoginToday).Error; err != nil {
		return nil, err
	}
	if err := s.DB.Model(&entity.SysLoginLog{}).
		Scopes(datascope.Apply(scope, dsOpt)).
		Where("login_time >= ? AND status = ?", todayStart, 0).
		Count(&res.LoginFailToday).Error; err != nil {
		return nil, err
	}

	return &res, nil
}

// ListOperLogs 查询操作日志分页列表
func (s *LogService) ListOperLogs(scope *datascope.Scope, req dto.OperLogListReq) (*dto.LogPageRes[entity.SysOperLog], error) {
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	query, err := s.buildOperLogQuery(scope, req)
	if err != nil {
		return nil, err
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	list := make([]entity.SysOperLog, 0)
	if err := query.Order("id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&list).Error; err != nil {
		return nil, err
	}

	return &dto.LogPageRes[entity.SysOperLog]{
		List:     list,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetOperLogByID 获取单条操作日志详情（带数据权限越权校验）
func (s *LogService) GetOperLogByID(scope *datascope.Scope, id uint) (*entity.SysOperLog, error) {
	var item entity.SysOperLog
	if err := s.DB.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("操作日志不存在")
		}
		return nil, err
	}
	if !datascope.CanAccessRecord(scope, item.DeptID, item.UserID) {
		return nil, errors.New("无权限查看该操作日志")
	}
	return &item, nil
}

// DeleteOperLogs 批量删除当前数据权限范围内的操作日志
func (s *LogService) DeleteOperLogs(scope *datascope.Scope, ids []uint) error {
	uniqueIDs := deduplicateIDs(ids)
	if len(uniqueIDs) == 0 {
		return errors.New("请选择需要删除的日志记录")
	}

	var rows []entity.SysOperLog
	if err := s.DB.Select("id, dept_id, user_id").Where("id IN ?", uniqueIDs).Find(&rows).Error; err != nil {
		return err
	}
	if len(rows) == 0 {
		return errors.New("未找到可删除的操作日志")
	}
	for _, r := range rows {
		if !datascope.CanAccessRecord(scope, r.DeptID, r.UserID) {
			return errors.New("包含无权删除的操作日志")
		}
	}
	return s.DB.Where("id IN ?", uniqueIDs).Delete(&entity.SysOperLog{}).Error
}

// ClearOperLogs 清空全部操作日志（仅限超级管理员或全数据范围角色）
func (s *LogService) ClearOperLogs(scope *datascope.Scope) error {
	if scope == nil || (!scope.IsSuperAdmin && !scope.AllData) {
		return errors.New("仅超级管理员或全部数据权限角色可清空全部操作日志")
	}
	return s.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&entity.SysOperLog{}).Error
}

// ListLoginLogs 查询登录日志分页列表
func (s *LogService) ListLoginLogs(scope *datascope.Scope, req dto.LoginLogListReq) (*dto.LogPageRes[entity.SysLoginLog], error) {
	page, pageSize := normalizePagination(req.Page, req.PageSize)
	query, err := s.buildLoginLogQuery(scope, req)
	if err != nil {
		return nil, err
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	list := make([]entity.SysLoginLog, 0)
	if err := query.Order("id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&list).Error; err != nil {
		return nil, err
	}

	return &dto.LogPageRes[entity.SysLoginLog]{
		List:     list,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// DeleteLoginLogs 批量删除当前数据权限范围内的登录日志
func (s *LogService) DeleteLoginLogs(scope *datascope.Scope, ids []uint) error {
	uniqueIDs := deduplicateIDs(ids)
	if len(uniqueIDs) == 0 {
		return errors.New("请选择需要删除的登录日志")
	}

	var rows []entity.SysLoginLog
	if err := s.DB.Select("id, dept_id, user_id").Where("id IN ?", uniqueIDs).Find(&rows).Error; err != nil {
		return err
	}
	if len(rows) == 0 {
		return errors.New("未找到可删除的登录日志")
	}
	for _, r := range rows {
		if !datascope.CanAccessRecord(scope, r.DeptID, r.UserID) {
			return errors.New("包含无权删除的登录日志")
		}
	}
	return s.DB.Where("id IN ?", uniqueIDs).Delete(&entity.SysLoginLog{}).Error
}

// ClearLoginLogs 清空全部登录日志（仅限超级管理员或全数据范围角色）
func (s *LogService) ClearLoginLogs(scope *datascope.Scope) error {
	if scope == nil || (!scope.IsSuperAdmin && !scope.AllData) {
		return errors.New("仅超级管理员或全部数据权限角色可清空全部登录日志")
	}
	return s.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&entity.SysLoginLog{}).Error
}

// ExportOperLogsCSV 按筛选条件与数据权限导出操作日志 CSV（含 UTF-8 BOM 与公式注入转义，最多 5000 条）
func (s *LogService) ExportOperLogsCSV(scope *datascope.Scope, req dto.OperLogListReq) ([]byte, error) {
	query, err := s.buildOperLogQuery(scope, req)
	if err != nil {
		return nil, err
	}

	var rows []entity.SysOperLog
	if err := query.Order("id DESC").Limit(maxLogExportRows).Find(&rows).Error; err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF})
	w := csv.NewWriter(&buf)

	headers := []string{"日志ID", "链路ID", "操作人", "操作模块", "操作类型", "请求方式", "请求URL", "状态", "耗时(ms)", "IP地址", "浏览器", "操作系统", "错误信息", "操作时间"}
	if err := w.Write(headers); err != nil {
		return nil, err
	}

	for _, r := range rows {
		statusText := "失败"
		if r.Status == 1 {
			statusText = "成功"
		}
		record := []string{
			fmt.Sprintf("%d", r.ID),
			sanitizeCSVCell(r.RequestID),
			sanitizeCSVCell(r.Operator),
			sanitizeCSVCell(r.Module),
			sanitizeCSVCell(r.Action),
			sanitizeCSVCell(r.Method),
			sanitizeCSVCell(r.URL),
			statusText,
			fmt.Sprintf("%d", r.Latency),
			sanitizeCSVCell(r.IP),
			sanitizeCSVCell(r.Browser),
			sanitizeCSVCell(r.OS),
			sanitizeCSVCell(r.ErrorMsg),
			r.CreatedAt.In(time.Local).Format("2006-01-02 15:04:05"),
		}
		if err := w.Write(record); err != nil {
			return nil, err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ExportLoginLogsCSV 按筛选条件与数据权限导出登录日志 CSV（含 UTF-8 BOM 与公式注入转义，最多 5000 条）
func (s *LogService) ExportLoginLogsCSV(scope *datascope.Scope, req dto.LoginLogListReq) ([]byte, error) {
	query, err := s.buildLoginLogQuery(scope, req)
	if err != nil {
		return nil, err
	}

	var rows []entity.SysLoginLog
	if err := query.Order("id DESC").Limit(maxLogExportRows).Find(&rows).Error; err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF})
	w := csv.NewWriter(&buf)

	headers := []string{"日志ID", "链路ID", "登录账号", "登录状态", "提示信息", "登录IP", "浏览器", "操作系统", "登录时间"}
	if err := w.Write(headers); err != nil {
		return nil, err
	}

	for _, r := range rows {
		statusText := "失败"
		if r.Status == 1 {
			statusText = "成功"
		}
		record := []string{
			fmt.Sprintf("%d", r.ID),
			sanitizeCSVCell(r.RequestID),
			sanitizeCSVCell(r.Username),
			statusText,
			sanitizeCSVCell(r.Message),
			sanitizeCSVCell(r.IP),
			sanitizeCSVCell(r.Browser),
			sanitizeCSVCell(r.OS),
			r.LoginTime.In(time.Local).Format("2006-01-02 15:04:05"),
		}
		if err := w.Write(record); err != nil {
			return nil, err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// sanitizeCSVCell 防止导出的 CSV 字段被 Excel 当作公式执行（CSV Injection 防护）
func sanitizeCSVCell(val string) string {
	if val == "" {
		return ""
	}
	first := val[0]
	if first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r' {
		return "'" + val
	}
	return val
}

func deduplicateIDs(ids []uint) []uint {
	seen := make(map[uint]struct{}, len(ids))
	res := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		res = append(res, id)
	}
	return res
}
