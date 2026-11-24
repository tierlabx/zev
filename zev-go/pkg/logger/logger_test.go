package logger

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSanitizeJSONMasksNestedAndCaseInsensitiveKeys(t *testing.T) {
	input := `{
		"username": "admin",
		"Password": "secret-password",
		"nested": {
			"accessToken": "tok-123",
			"refresh_token": "ref-456",
			"safe": "hello"
		},
		"items": [
			{"apiKey": "k1", "name": "item1"}
		]
	}`

	out := SanitizeJSON([]byte(input), 4096)

	var got map[string]any
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("expected valid JSON output, got error %v, output=%s", err, out)
	}
	if got["username"] != "admin" {
		t.Fatalf("expected username admin, got %v", got["username"])
	}
	if got["Password"] != MaskedValue {
		t.Fatalf("expected masked Password, got %v", got["Password"])
	}

	nested := got["nested"].(map[string]any)
	if nested["accessToken"] != MaskedValue || nested["refresh_token"] != MaskedValue {
		t.Fatalf("expected nested tokens masked, got %+v", nested)
	}
	if nested["safe"] != "hello" {
		t.Fatalf("expected safe field preserved, got %v", nested["safe"])
	}
}

func TestSanitizeJSONHandlesPlainTextAndUTF8Truncation(t *testing.T) {
	plain := "username=admin&password=mysecret&note=正常中文测试内容"
	out := SanitizeJSON([]byte(plain), 256)
	if strings.Contains(out, "mysecret") {
		t.Fatalf("expected plain secret masked, got %s", out)
	}

	longUTF8 := "中文日志内容测试截取边界是否合法"
	truncated := TruncateString(longUTF8, 10)
	if !strings.HasSuffix(truncated, "...(truncated)") {
		t.Fatalf("expected truncation suffix, got %s", truncated)
	}
}

func TestSanitizeQuery(t *testing.T) {
	got := SanitizeQuery("page=1&token=abc123&keyword=admin", 256)
	if strings.Contains(got, "abc123") {
		t.Fatalf("expected token masked in query, got %s", got)
	}
	if !strings.Contains(got, "token="+MaskedValue) || !strings.Contains(got, "page=1") {
		t.Fatalf("unexpected sanitized query: %s", got)
	}
}

func TestParseUserAgent(t *testing.T) {
	cases := []struct {
		ua      string
		browser string
		os      string
	}{
		{
			ua:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
			browser: "Edge",
			os:      "Windows",
		},
		{
			ua:      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
			browser: "Chrome",
			os:      "macOS",
		},
		{
			ua:      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			browser: "Safari",
			os:      "iOS",
		},
		{
			ua:      "curl/8.4.0",
			browser: "curl",
			os:      "CLI/API",
		},
	}

	for _, tc := range cases {
		b, osName := ParseUserAgent(tc.ua)
		if b != tc.browser || osName != tc.os {
			t.Fatalf("UA=%q got (%s, %s), want (%s, %s)", tc.ua, b, osName, tc.browser, tc.os)
		}
	}
}

func TestRotatingFileWriterRotatesAndPrunesBackups(t *testing.T) {
	dir := t.TempDir()
	logPath := filepath.Join(dir, "app.log")

	w, err := newRotatingFileWriter(logPath, 1, 2)
	if err != nil {
		t.Fatalf("failed to create rotating writer: %v", err)
	}
	// 缩小轮转阈值方便单测验证，避免写入 MB 级测试数据
	w.maxBytes = 50
	defer func() { _ = w.Close() }()

	chunk := []byte(strings.Repeat("a", 30) + "\n")
	for i := 0; i < 6; i++ {
		if _, err := w.Write(chunk); err != nil {
			t.Fatalf("write failed at step %d: %v", i, err)
		}
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("readdir failed: %v", err)
	}
	// 1 个活跃文件 + 最多 2 个备份文件 = 3 个文件
	if len(entries) > 3 {
		t.Fatalf("expected at most 3 files (1 active + 2 backups), got %d", len(entries))
	}
}
