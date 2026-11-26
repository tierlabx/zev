package runtime

import (
	"context"
	"errors"
	"sync"
	"time"
)

const resolvedCacheTTL = 15 * time.Minute

// ApprovalDecision 表示管理员对高危工具调用审批单的最终裁决
type ApprovalDecision struct {
	ApprovalID uint
	Approved   bool
	Approver   string
	Comment    string
}

type resolvedRecord struct {
	decision ApprovalDecision
	at       time.Time
}

// ApprovalBroker 维护挂起等待人工审批的 Run 通道，支持并发安全唤醒、预注册与超时取消
type ApprovalBroker struct {
	mu       sync.Mutex
	waiters  map[uint]chan ApprovalDecision
	resolved map[uint]resolvedRecord
}

func NewApprovalBroker() *ApprovalBroker {
	return &ApprovalBroker{
		waiters:  make(map[uint]chan ApprovalDecision),
		resolved: make(map[uint]resolvedRecord),
	}
}

// Register 为指定审批单号注册等待通道；若审批已提前完成则立即投递缓存结果，避免先 Resolve 后 Wait 丢唤醒
func (b *ApprovalBroker) Register(approvalID uint) <-chan ApprovalDecision {
	b.mu.Lock()
	defer b.mu.Unlock()

	if rec, ok := b.resolved[approvalID]; ok {
		delete(b.resolved, approvalID)
		ch := make(chan ApprovalDecision, 1)
		ch <- rec.decision
		return ch
	}
	if existing, ok := b.waiters[approvalID]; ok {
		return existing
	}
	ch := make(chan ApprovalDecision, 1)
	b.waiters[approvalID] = ch
	return ch
}

// Unregister 清理不再等待的审批单通道与残留缓存
func (b *ApprovalBroker) Unregister(approvalID uint) {
	b.mu.Lock()
	delete(b.waiters, approvalID)
	delete(b.resolved, approvalID)
	b.mu.Unlock()
}

// Wait 阻塞等待管理员裁决、上下文取消或超时到期
func (b *ApprovalBroker) Wait(ctx context.Context, approvalID uint, timeout time.Duration) (ApprovalDecision, error) {
	ch := b.Register(approvalID)
	defer b.Unregister(approvalID)

	if timeout <= 0 {
		timeout = 5 * time.Minute
	}
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ApprovalDecision{}, ctx.Err()
	case <-timer.C:
		return ApprovalDecision{}, errors.New("人工审批等待超时，工具调用已自动取消")
	case decision := <-ch:
		return decision, nil
	}
}

// Resolve 唤醒正在等待指定审批单的执行协程；若尚未进入 Wait 阶段则暂存裁决结果供后续消费
func (b *ApprovalBroker) Resolve(decision ApprovalDecision) bool {
	now := time.Now()
	b.mu.Lock()
	ch, ok := b.waiters[decision.ApprovalID]
	if ok {
		delete(b.waiters, decision.ApprovalID)
		b.mu.Unlock()
		select {
		case ch <- decision:
			return true
		default:
			return false
		}
	}

	// 清理过期缓存后暂存已决结果，消除 Create -> Notify -> Wait 之间的竞态窗口
	for id, rec := range b.resolved {
		if now.Sub(rec.at) > resolvedCacheTTL {
			delete(b.resolved, id)
		}
	}
	b.resolved[decision.ApprovalID] = resolvedRecord{decision: decision, at: now}
	b.mu.Unlock()
	return true
}
