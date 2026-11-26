package captcha

import (
	"bytes"
	"encoding/base64"
	"strings"
	"testing"
)

func TestGenerateAndVerify(t *testing.T) {
	mgr := NewDefault()

	id, b64s, err := mgr.Generate()
	if err != nil {
		t.Fatalf("Generate() 返回意外错误: %v", err)
	}
	if id == "" {
		t.Fatal("Generate() 返回了空的验证码 ID")
	}

	const prefix = "data:image/png;base64,"
	if !strings.HasPrefix(b64s, prefix) {
		t.Fatalf("Generate() 图片格式不符合预期: %q", b64s[:min(len(b64s), 32)])
	}

	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(b64s, prefix))
	if err != nil {
		t.Fatalf("Base64 解码失败: %v", err)
	}
	// PNG 文件头魔数: 89 50 4E 47 0D 0A 1A 0A
	pngMagic := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	if len(raw) < len(pngMagic) || !bytes.Equal(raw[:len(pngMagic)], pngMagic) {
		t.Fatal("解码后的数据不是合法的 PNG 图像")
	}

	// 读取存储中的答案以验证大小写不敏感与空白容错（clear=false 避免影响后续校验）
	answer := mgr.store.Get(id, false)
	if len(answer) != defaultLength {
		t.Fatalf("存储答案长度 = %d, 期望 %d", len(answer), defaultLength)
	}

	// 大小写混合及首尾空白应通过校验
	mixed := "  " + strings.ToUpper(answer) + " "
	if !mgr.Verify(id, mixed) {
		t.Fatal("大小写转换并带空白的正确验证码应当校验通过")
	}

	// 一次性消费：校验通过后二次使用同一 ID 必须失败
	if mgr.Verify(id, answer) {
		t.Fatal("已使用的验证码不应允许重复校验通过")
	}
}

func TestVerifyFailureClearsCaptcha(t *testing.T) {
	mgr := NewDefault()

	id, _, err := mgr.Generate()
	if err != nil {
		t.Fatalf("Generate() 返回意外错误: %v", err)
	}
	answer := mgr.store.Get(id, false)

	// 输错一次后，该验证码应立即失效
	if mgr.Verify(id, "WRONG") {
		t.Fatal("错误的验证码不应校验通过")
	}
	if mgr.Verify(id, answer) {
		t.Fatal("输错一次后，同一 ID 即便再提交正确答案也必须失效")
	}
}

func TestVerifyEmptyInputs(t *testing.T) {
	mgr := NewDefault()

	id, _, err := mgr.Generate()
	if err != nil {
		t.Fatalf("Generate() 返回意外错误: %v", err)
	}

	if mgr.Verify("", "ABCD") {
		t.Fatal("空 ID 不应校验通过")
	}
	if mgr.Verify("   ", "ABCD") {
		t.Fatal("纯空白 ID 不应校验通过")
	}
	if mgr.Verify(id, "") {
		t.Fatal("空验证码不应校验通过")
	}
	if mgr.Verify(id, "   ") {
		t.Fatal("纯空白验证码不应校验通过")
	}
}

func TestExpireSeconds(t *testing.T) {
	mgr := NewDefault()
	if got := mgr.ExpireSeconds(); got != 180 {
		t.Fatalf("ExpireSeconds() = %d, 期望 180", got)
	}
}
