package service

import (
	"slices"
	"testing"
	"time"
)

func TestEncodeDecodeTargetIDs(t *testing.T) {
	encoded := encodeTargetIDs([]uint{0, 3, 2, 3, 5})
	decoded := decodeTargetIDs(encoded)
	want := []uint{3, 2, 5}
	if !slices.Equal(decoded, want) {
		t.Fatalf("got %v, want %v", decoded, want)
	}

	if got := decodeTargetIDs(""); len(got) != 0 {
		t.Fatalf("expected empty slice on blank string, got %v", got)
	}
	if got := decodeTargetIDs("invalid-json"); len(got) != 0 {
		t.Fatalf("expected empty slice on invalid JSON, got %v", got)
	}
}

func TestNormalizeInternalLink(t *testing.T) {
	valid, err := normalizeInternalLink("  /system/log/oper  ")
	if err != nil || valid != "/system/log/oper" {
		t.Fatalf("expected trimmed path, got (%q, %v)", valid, err)
	}

	empty, err := normalizeInternalLink("   ")
	if err != nil || empty != "" {
		t.Fatalf("expected empty link allowed, got (%q, %v)", empty, err)
	}

	for _, bad := range []string{"https://evil.com", "//evil.com", "javascript:alert(1)", "system/user"} {
		if _, err := normalizeInternalLink(bad); err == nil {
			t.Fatalf("expected error for unsafe link %q", bad)
		}
	}
}

func TestSummarizeContent(t *testing.T) {
	raw := "第一行标题\n\n   第二行正文   包含   多余空白"
	got := SummarizeContent(raw, 10)
	if got != "第一行标题 第二行正..." {
		t.Fatalf("unexpected summary %q", got)
	}
}

func TestBuildSentRecipientSummary(t *testing.T) {
	now := time.Now()
	rows := []sentRecipientRow{
		{NoticeID: 10, UserID: 2, Username: "user", Nickname: "普通用户", IsRead: true, ReadAt: &now},
		{NoticeID: 10, UserID: 3, Username: "manager", Nickname: "研发主管", IsRead: false},
		{NoticeID: 10, UserID: 4, Username: "alice", Nickname: "Alice", IsRead: true, ReadAt: &now},
		{NoticeID: 11, UserID: 2, Username: "user", Nickname: "普通用户", IsRead: false},
	}

	stats, previews := buildSentRecipientSummary(rows, 2)

	if st := stats[10]; st.TotalCount != 3 || st.ReadCount != 2 {
		t.Fatalf("unexpected notice 10 stats: %+v", st)
	}
	if len(previews[10]) != 2 {
		t.Fatalf("expected preview truncated to 2 items, got %d", len(previews[10]))
	}
	if previews[10][0].Username != "user" || previews[10][1].Username != "manager" {
		t.Fatalf("unexpected preview order: %+v", previews[10])
	}
	if st := stats[11]; st.TotalCount != 1 || st.ReadCount != 0 {
		t.Fatalf("unexpected notice 11 stats: %+v", st)
	}
}
