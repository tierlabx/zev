package service

import (
	"slices"
	"testing"
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
