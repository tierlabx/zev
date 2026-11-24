package noticehub

import (
	"testing"
	"time"
)

func TestHubSubscribePublishUnsubscribeAndClose(t *testing.T) {
	hub := NewHub()
	defer hub.Close()

	ch1, cancel1 := hub.Subscribe(10)
	ch2, cancel2 := hub.Subscribe(20)
	defer cancel2()

	evt := PushEvent{
		NoticeID:    99,
		Title:       "系统升级通知",
		Summary:     "今晚将进行平滑发布",
		Type:        1,
		Level:       1,
		Sender:      "admin",
		PublishedAt: time.Now(),
	}

	hub.Publish([]uint{10, 10}, evt)

	select {
	case got := <-ch1:
		if got.NoticeID != 99 || got.Title != "系统升级通知" {
			t.Fatalf("unexpected event payload: %+v", got)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for published event on user 10")
	}

	select {
	case unexpected := <-ch2:
		t.Fatalf("user 20 should not receive event meant for user 10, got %+v", unexpected)
	default:
	}

	cancel1()
	// 重复调用注销函数应保持幂等安全
	cancel1()

	hub.Close()
	select {
	case <-hub.Done():
	default:
		t.Fatal("expected hub Done channel to be closed")
	}
}
