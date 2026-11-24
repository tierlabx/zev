package audit

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestWriterDrainsQueuedRecordsOnShutdown(t *testing.T) {
	var count atomic.Int32
	w := newWriter(func(record any) error {
		time.Sleep(2 * time.Millisecond)
		count.Add(1)
		return nil
	}, 32)

	for i := 0; i < 10; i++ {
		if !w.enqueue(i) {
			t.Fatalf("expected enqueue %d to succeed", i)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := w.shutdown(ctx); err != nil {
		t.Fatalf("unexpected shutdown error: %v", err)
	}

	if got := count.Load(); got != 10 {
		t.Fatalf("expected 10 persisted records, got %d", got)
	}
	if w.enqueue("after-close") {
		t.Fatalf("expected enqueue after shutdown to return false")
	}
}

func TestWriterDropsSafelyWhenQueueIsFullAndHandlesConcurrentSubmitShutdown(t *testing.T) {
	blockCh := make(chan struct{})
	w := newWriter(func(record any) error {
		<-blockCh
		return nil
	}, 1)

	// 第一条被 worker 取走并阻塞，第二条填满容量为 1 的队列，第三条应非阻塞丢弃
	w.enqueue("first")
	time.Sleep(10 * time.Millisecond)
	if !w.enqueue("second") {
		t.Fatalf("expected buffer slot to accept record")
	}
	if w.enqueue("third-overflow") {
		t.Fatalf("expected overflow record to be dropped when queue is full")
	}

	close(blockCh)
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			w.enqueue(idx)
		}(i)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := w.shutdown(ctx); err != nil {
		t.Fatalf("shutdown error: %v", err)
	}
	wg.Wait()
}
