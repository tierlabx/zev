package logger

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type contextKey string

const requestIDKey contextKey = "request_id"

// Options 日志初始化配置
type Options struct {
	Level      string
	Format     string // text 或 json
	FilePath   string // 为空时仅输出到标准输出
	MaxSizeMB  int    // 单文件最大 MB，默认 20
	MaxBackups int    // 保留的历史备份文件数，默认 7
}

type rotatingFileWriter struct {
	mu         sync.Mutex
	filePath   string
	maxBytes   int64
	maxBackups int
	file       *os.File
	size       int64
}

func newRotatingFileWriter(filePath string, maxSizeMB, maxBackups int) (*rotatingFileWriter, error) {
	if maxSizeMB <= 0 {
		maxSizeMB = 20
	}
	if maxBackups <= 0 {
		maxBackups = 7
	}
	w := &rotatingFileWriter{
		filePath:   filePath,
		maxBytes:   int64(maxSizeMB) * 1024 * 1024,
		maxBackups: maxBackups,
	}
	if err := w.openOrCreate(); err != nil {
		return nil, err
	}
	return w, nil
}

func (w *rotatingFileWriter) openOrCreate() error {
	dir := filepath.Dir(w.filePath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("创建日志目录失败: %w", err)
		}
	}
	f, err := os.OpenFile(w.filePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("打开日志文件失败: %w", err)
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return fmt.Errorf("读取日志文件状态失败: %w", err)
	}
	w.file = f
	w.size = info.Size()
	return nil
}

func (w *rotatingFileWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.file == nil {
		if err := w.openOrCreate(); err != nil {
			return 0, err
		}
	}

	// 单文件达到上限时先归档轮转，避免单文件无限膨胀影响排查与磁盘安全
	if w.maxBytes > 0 && w.size+int64(len(p)) > w.maxBytes && w.size > 0 {
		if err := w.rotate(); err != nil {
			return 0, err
		}
	}

	n, err := w.file.Write(p)
	w.size += int64(n)
	return n, err
}

func (w *rotatingFileWriter) rotate() error {
	if w.file != nil {
		if err := w.file.Close(); err != nil {
			return err
		}
		w.file = nil
	}

	ext := filepath.Ext(w.filePath)
	base := strings.TrimSuffix(filepath.Base(w.filePath), ext)
	dir := filepath.Dir(w.filePath)
	timestamp := time.Now().Format("20060102-150405.000000000")
	backupPath := filepath.Join(dir, fmt.Sprintf("%s.%s%s", base, timestamp, ext))

	if _, err := os.Stat(w.filePath); err == nil {
		if err := os.Rename(w.filePath, backupPath); err != nil {
			return fmt.Errorf("轮转重命名日志文件失败: %w", err)
		}
	}

	if err := w.openOrCreate(); err != nil {
		return err
	}
	w.cleanupOldBackups(dir, base, ext)
	return nil
}

func (w *rotatingFileWriter) cleanupOldBackups(dir, base, ext string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	prefix := base + "."
	currentName := filepath.Base(w.filePath)
	var backups []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if name == currentName {
			continue
		}
		if strings.HasPrefix(name, prefix) && strings.HasSuffix(name, ext) {
			backups = append(backups, name)
		}
	}
	if len(backups) <= w.maxBackups {
		return
	}
	// 文件名带定长时间戳，按字典序升序即按时间从旧到新排列
	sort.Strings(backups)
	removeCount := len(backups) - w.maxBackups
	for i := 0; i < removeCount; i++ {
		_ = os.Remove(filepath.Join(dir, backups[i]))
	}
}

func (w *rotatingFileWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return nil
	}
	err := w.file.Close()
	w.file = nil
	return err
}

// ParseLevel 解析日志级别配置
func ParseLevel(raw string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Init 初始化全局 slog 日志器，支持控制台与可选轮转文件双写
func Init(opts Options) (func() error, error) {
	level := ParseLevel(opts.Level)
	var writer io.Writer = os.Stdout
	var closer io.Closer

	if path := strings.TrimSpace(opts.FilePath); path != "" {
		rotWriter, err := newRotatingFileWriter(path, opts.MaxSizeMB, opts.MaxBackups)
		if err != nil {
			return nil, err
		}
		closer = rotWriter
		writer = io.MultiWriter(os.Stdout, rotWriter)
	}

	handlerOpts := &slog.HandlerOptions{
		Level:     level,
		AddSource: level == slog.LevelDebug,
	}

	var handler slog.Handler
	if strings.EqualFold(strings.TrimSpace(opts.Format), "json") {
		handler = slog.NewJSONHandler(writer, handlerOpts)
	} else {
		handler = slog.NewTextHandler(writer, handlerOpts)
	}

	slog.SetDefault(slog.New(handler))

	cleanup := func() error {
		if closer != nil {
			return closer.Close()
		}
		return nil
	}
	return cleanup, nil
}

// WithRequestID 将链路请求 ID 写入 Context
func WithRequestID(ctx context.Context, requestID string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, requestIDKey, requestID)
}

// RequestIDFromContext 从 Context 读取请求 ID
func RequestIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if v, ok := ctx.Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

// FromContext 返回自动携带 request_id 字段的 slog.Logger
func FromContext(ctx context.Context) *slog.Logger {
	rid := RequestIDFromContext(ctx)
	if rid == "" {
		return slog.Default()
	}
	return slog.Default().With("request_id", rid)
}
