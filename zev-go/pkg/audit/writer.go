package audit

import (
	"context"
	"log/slog"
	"sync"

	"gorm.io/gorm"
)

const defaultBufferSize = 1024

// Writer 有界异步审计写入器，避免日志入库阻塞 HTTP 请求并在停机时排空队列
type Writer struct {
	mu      sync.RWMutex
	closed  bool
	ch      chan any
	done    chan struct{}
	persist func(record any) error
}

var (
	globalMu     sync.RWMutex
	globalWriter *Writer
)

// Init 初始化全局异步审计写入器
func Init(db *gorm.DB, bufferSize int) {
	persist := func(record any) error {
		if db == nil {
			return nil
		}
		return db.Create(record).Error
	}
	w := newWriter(persist, bufferSize)
	globalMu.Lock()
	globalWriter = w
	globalMu.Unlock()
}

func newWriter(persist func(record any) error, bufferSize int) *Writer {
	if bufferSize <= 0 {
		bufferSize = defaultBufferSize
	}
	w := &Writer{
		ch:      make(chan any, bufferSize),
		done:    make(chan struct{}),
		persist: persist,
	}
	go w.run()
	return w
}

func (w *Writer) run() {
	defer close(w.done)
	for record := range w.ch {
		w.safePersist(record)
	}
}

func (w *Writer) safePersist(record any) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("异步审计写入发生Panic", "panic", r)
		}
	}()
	if w.persist == nil {
		return
	}
	if err := w.persist(record); err != nil {
		slog.Error("异步审计写入数据库失败", "err", err)
	}
}

// enqueue 非阻塞入队，防止关闭瞬间并发写入触发 send on closed channel
func (w *Writer) enqueue(record any) bool {
	if record == nil || w == nil {
		return false
	}
	w.mu.RLock()
	defer w.mu.RUnlock()

	if w.closed {
		return false
	}
	select {
	case w.ch <- record:
		return true
	default:
		slog.Warn("审计日志队列已满，丢弃当前记录以保护主业务可用性")
		return false
	}
}

func (w *Writer) shutdown(ctx context.Context) error {
	if w == nil {
		return nil
	}
	w.mu.Lock()
	if !w.closed {
		w.closed = true
		close(w.ch)
	}
	w.mu.Unlock()

	select {
	case <-w.done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Submit 提交审计记录到异步写入队列（队列未初始化、已关闭或满载时返回 false）
func Submit(record any) bool {
	globalMu.RLock()
	w := globalWriter
	globalMu.RUnlock()
	if w == nil {
		return false
	}
	return w.enqueue(record)
}

// Shutdown 优雅排空并关闭全局审计队列，阻塞直至队列写完或上下文超时
func Shutdown(ctx context.Context) error {
	globalMu.Lock()
	w := globalWriter
	globalWriter = nil
	globalMu.Unlock()
	if w == nil {
		return nil
	}
	return w.shutdown(ctx)
}
