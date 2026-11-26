package provider

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"
)

// HTTPStatusError 封装上游模型网关返回的非 2xx 错误状态码，供重试策略精准区分可重试错误
type HTTPStatusError struct {
	StatusCode int
	Body       string
}

func (e *HTTPStatusError) Error() string {
	return fmt.Sprintf("上游模型接口返回 %d: %s", e.StatusCode, e.Body)
}

func isRetryable(err error) bool {
	if err == nil || errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}
	var statusErr *HTTPStatusError
	if errors.As(err, &statusErr) {
		return statusErr.StatusCode == 429 || statusErr.StatusCode >= 500
	}
	var netErr net.Error
	return errors.As(err, &netErr)
}

// circuitBreaker 轻量级连续失败熔断器，防止上游故障雪崩拖垮后端线程池
type circuitBreaker struct {
	mu        sync.Mutex
	failures  int
	threshold int
	openUntil time.Time
	cooldown  time.Duration
}

var (
	breakersMu sync.Mutex
	breakers   = make(map[string]*circuitBreaker)
)

func getBreaker(key string) *circuitBreaker {
	breakersMu.Lock()
	defer breakersMu.Unlock()
	b, ok := breakers[key]
	if !ok {
		b = &circuitBreaker{threshold: 5, cooldown: 30 * time.Second}
		breakers[key] = b
	}
	return b
}

func (b *circuitBreaker) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.failures < b.threshold {
		return true
	}
	if time.Now().After(b.openUntil) {
		b.failures = b.threshold - 1 // 半开探测
		return true
	}
	return false
}

func (b *circuitBreaker) recordSuccess() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures = 0
	b.openUntil = time.Time{}
}

func (b *circuitBreaker) recordFailure() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures++
	if b.failures >= b.threshold {
		b.openUntil = time.Now().Add(b.cooldown)
	}
}

type resilientClient struct {
	inner      Client
	breaker    *circuitBreaker
	maxRetries int
	baseDelay  time.Duration
}

func (r *resilientClient) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	if !r.breaker.allow() {
		return nil, errors.New("模型供应商连续异常已触发熔断保护，请稍后重试")
	}
	var lastErr error
	for attempt := 0; attempt <= r.maxRetries; attempt++ {
		res, err := r.inner.Chat(ctx, req)
		if err == nil {
			r.breaker.recordSuccess()
			return res, nil
		}
		lastErr = err
		if !isRetryable(err) || attempt == r.maxRetries {
			break
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(r.baseDelay * time.Duration(1<<attempt)):
		}
	}
	if isRetryable(lastErr) {
		r.breaker.recordFailure()
	}
	return nil, lastErr
}

func (r *resilientClient) ChatStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk) error) (*ChatResponse, error) {
	if !r.breaker.allow() {
		return nil, errors.New("模型供应商连续异常已触发熔断保护，请稍后重试")
	}
	var lastErr error
	for attempt := 0; attempt <= r.maxRetries; attempt++ {
		emitted := false
		wrappedChunk := func(ch StreamChunk) error {
			if ch.DeltaContent != "" {
				emitted = true
			}
			if onChunk != nil {
				return onChunk(ch)
			}
			return nil
		}
		res, err := r.inner.ChatStream(ctx, req, wrappedChunk)
		if err == nil {
			r.breaker.recordSuccess()
			return res, nil
		}
		lastErr = err
		// 已经开始向下游推送文本片段后禁止自动重放，防止前端出现重复输出
		if emitted || !isRetryable(err) || attempt == r.maxRetries {
			break
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(r.baseDelay * time.Duration(1<<attempt)):
		}
	}
	if isRetryable(lastErr) {
		r.breaker.recordFailure()
	}
	return nil, lastErr
}

func (r *resilientClient) Ping(ctx context.Context, model string) (int64, error) {
	return r.inner.Ping(ctx, model)
}

// NewClient 根据供应商类型构造统一客户端，并自动包装指数退避重试与熔断器
func NewClient(cfg Config) (Client, error) {
	var inner Client
	switch strings.ToLower(strings.TrimSpace(cfg.ProviderType)) {
	case TypeOpenAI, TypeOllama, "":
		inner = NewOpenAIClient(cfg)
	case TypeAnthropic:
		inner = NewAnthropicClient(cfg)
	case TypeGemini:
		inner = NewGeminiClient(cfg)
	default:
		return nil, fmt.Errorf("不支持的模型供应商类型: %s", cfg.ProviderType)
	}
	breakerKey := strings.ToLower(cfg.ProviderType) + "|" + strings.TrimRight(cfg.BaseURL, "/")
	return &resilientClient{
		inner:      inner,
		breaker:    getBreaker(breakerKey),
		maxRetries: 2,
		baseDelay:  300 * time.Millisecond,
	}, nil
}
