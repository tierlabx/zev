package noticehub

import (
	"sync"
	"time"
)

const clientBufferSize = 16

// PushEvent 实时推送给前端 SSE 客户端的通知事件载荷
type PushEvent struct {
	NoticeID    uint      `json:"noticeId"`
	Title       string    `json:"title"`
	Summary     string    `json:"summary"`
	Type        int       `json:"type"`
	Level       int       `json:"level"`
	Sender      string    `json:"sender"`
	Link        string    `json:"link"`
	PublishedAt time.Time `json:"publishedAt"`
}

// Hub 维护在线用户的 SSE 订阅连接并支持并发安全定向投递与优雅关闭
type Hub struct {
	mu        sync.RWMutex
	clients   map[uint]map[chan PushEvent]struct{}
	closed    bool
	done      chan struct{}
	closeOnce sync.Once
}

var defaultHub = NewHub()

// NewHub 创建独立的消息推送 Hub 实例
func NewHub() *Hub {
	return &Hub{
		clients: make(map[uint]map[chan PushEvent]struct{}),
		done:    make(chan struct{}),
	}
}

// Subscribe 为指定用户注册一个 SSE 订阅通道并返回注销函数
func (h *Hub) Subscribe(userID uint) (<-chan PushEvent, func()) {
	ch := make(chan PushEvent, clientBufferSize)
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.closed || userID == 0 {
		close(ch)
		return ch, func() {}
	}

	set, ok := h.clients[userID]
	if !ok {
		set = make(map[chan PushEvent]struct{})
		h.clients[userID] = set
	}
	set[ch] = struct{}{}

	var once sync.Once
	cancel := func() {
		once.Do(func() {
			h.mu.Lock()
			defer h.mu.Unlock()
			if userSet, exists := h.clients[userID]; exists {
				if _, chExists := userSet[ch]; chExists {
					delete(userSet, ch)
					close(ch)
				}
				if len(userSet) == 0 {
					delete(h.clients, userID)
				}
			}
		})
	}
	return ch, cancel
}

// Publish 向目标用户列表非阻塞推送实时事件
func (h *Hub) Publish(userIDs []uint, evt PushEvent) {
	if len(userIDs) == 0 {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()

	if h.closed {
		return
	}

	seen := make(map[uint]struct{}, len(userIDs))
	for _, uid := range userIDs {
		if uid == 0 {
			continue
		}
		if _, ok := seen[uid]; ok {
			continue
		}
		seen[uid] = struct{}{}

		for ch := range h.clients[uid] {
			select {
			case ch <- evt:
			default:
				// 客户端消费过慢时丢弃瞬时推送，避免阻塞业务写入与发布流程
			}
		}
	}
}

// Done 返回 Hub 关闭信号通道，供 SSE 长连接在停机时立刻退出
func (h *Hub) Done() <-chan struct{} {
	return h.done
}

// Close 优雅关闭 Hub 并释放全部活跃订阅连接
func (h *Hub) Close() {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.closed {
		return
	}
	h.closed = true
	h.closeOnce.Do(func() {
		close(h.done)
	})
	for uid, userSet := range h.clients {
		for ch := range userSet {
			close(ch)
		}
		delete(h.clients, uid)
	}
}

// Subscribe 使用默认全局 Hub 订阅当前用户实时消息
func Subscribe(userID uint) (<-chan PushEvent, func()) {
	return defaultHub.Subscribe(userID)
}

// Publish 使用默认全局 Hub 向目标用户推送实时消息
func Publish(userIDs []uint, evt PushEvent) {
	defaultHub.Publish(userIDs, evt)
}

// Done 返回全局 Hub 的关闭通知通道
func Done() <-chan struct{} {
	return defaultHub.Done()
}

// Close 关闭全局 Hub
func Close() {
	defaultHub.Close()
}
