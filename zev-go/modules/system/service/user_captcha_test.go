package service

import (
	"strings"
	"testing"

	"zev-go/modules/system/dto"
	"zev-go/pkg/captcha"
)

func TestUserServiceGenerateCaptcha(t *testing.T) {
	svc := NewUserService(nil, nil, nil, nil, captcha.NewDefault())

	res, err := svc.GenerateCaptcha()
	if err != nil {
		t.Fatalf("GenerateCaptcha() 返回意外错误: %v", err)
	}
	if res.CaptchaID == "" {
		t.Fatal("CaptchaID 不应为空")
	}
	if !strings.HasPrefix(res.CaptchaImg, "data:image/png;base64,") {
		t.Fatalf("CaptchaImg 格式不符合预期: %q", res.CaptchaImg[:min(len(res.CaptchaImg), 32)])
	}
	if res.ExpireAfter <= 0 {
		t.Fatalf("ExpireAfter = %d, 期望大于 0", res.ExpireAfter)
	}
}

func TestUserServiceLoginRejectsInvalidCaptchaBeforeDB(t *testing.T) {
	svc := NewUserService(nil, nil, nil, nil, captcha.NewDefault())

	_, err := svc.Login(dto.LoginReq{
		Username:    "admin",
		Password:    "123456",
		CaptchaID:   "non-existent-id",
		CaptchaCode: "ABCD",
	}, dto.ClientMeta{IP: "127.0.0.1"})

	if err == nil {
		t.Fatal("无效验证码应当拦截登录")
	}
	if err.Error() != "验证码错误或已过期" {
		t.Fatalf("错误提示 = %q, 期望 %q", err.Error(), "验证码错误或已过期")
	}
}
