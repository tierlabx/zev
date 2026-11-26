package captcha

import (
	"image/color"
	"strings"
	"time"

	"github.com/mojocn/base64Captcha"
)

const (
	// 剔除 0/O/1/I 等易混淆字符，降低人工识读误差
	defaultSource     = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
	defaultHeight     = 48
	defaultWidth      = 136
	defaultLength     = 4
	defaultCollectNum = 2048
	defaultExpiration = 3 * time.Minute
)

// Options 图形验证码配置参数
type Options struct {
	Height     int
	Width      int
	Length     int
	CollectNum int
	Expiration time.Duration
}

// DefaultOptions 返回与登录表单尺寸和极简风格对齐的默认配置
func DefaultOptions() Options {
	return Options{
		Height:     defaultHeight,
		Width:      defaultWidth,
		Length:     defaultLength,
		CollectNum: defaultCollectNum,
		Expiration: defaultExpiration,
	}
}

// caseInsensitiveStore 包装内存存储，统一按小写并去除首尾空白进行存储与比对
type caseInsensitiveStore struct {
	inner base64Captcha.Store
}

func (s *caseInsensitiveStore) Set(id string, value string) error {
	return s.inner.Set(id, strings.ToLower(strings.TrimSpace(value)))
}

func (s *caseInsensitiveStore) Get(id string, clear bool) string {
	return s.inner.Get(id, clear)
}

func (s *caseInsensitiveStore) Verify(id, answer string, clear bool) bool {
	trimmedID := strings.TrimSpace(id)
	normalizedAnswer := strings.ToLower(strings.TrimSpace(answer))
	if trimmedID == "" || normalizedAnswer == "" {
		return false
	}
	return s.inner.Verify(trimmedID, normalizedAnswer, clear)
}

// Manager 图形验证码管理器，负责生成 Base64 验证码图片与一次性校验
type Manager struct {
	captcha    *base64Captcha.Captcha
	store      base64Captcha.Store
	expiration time.Duration
}

// New 根据传入配置创建验证码管理器，零值字段自动回退到默认参数
func New(opts Options) *Manager {
	defaults := DefaultOptions()
	if opts.Height <= 0 {
		opts.Height = defaults.Height
	}
	if opts.Width <= 0 {
		opts.Width = defaults.Width
	}
	if opts.Length <= 0 {
		opts.Length = defaults.Length
	}
	if opts.CollectNum <= 0 {
		opts.CollectNum = defaults.CollectNum
	}
	if opts.Expiration <= 0 {
		opts.Expiration = defaults.Expiration
	}

	// 采用极简冷浅灰底色与单一正弦干扰线，保证黑白灰登录页上的高可读性
	driver := base64Captcha.NewDriverString(
		opts.Height,
		opts.Width,
		0,
		base64Captcha.OptionShowSineLine,
		opts.Length,
		defaultSource,
		&color.RGBA{R: 244, G: 245, B: 247, A: 255},
		base64Captcha.DefaultEmbeddedFonts,
		[]string{"wqy-microhei.ttc"},
	).ConvertFonts()

	store := &caseInsensitiveStore{
		inner: base64Captcha.NewMemoryStore(opts.CollectNum, opts.Expiration),
	}

	return &Manager{
		captcha:    base64Captcha.NewCaptcha(driver, store),
		store:      store,
		expiration: opts.Expiration,
	}
}

// NewDefault 使用默认参数创建验证码管理器
func NewDefault() *Manager {
	return New(DefaultOptions())
}

// Generate 生成一个新的图形验证码，返回验证码 ID 与 data:image/png;base64,... 字符串
func (m *Manager) Generate() (id string, b64s string, err error) {
	id, b64s, _, err = m.captcha.Generate()
	return id, b64s, err
}

// Verify 校验用户输入的验证码；无论校验成功或失败都会立即销毁该 ID，防止重放与针对单 ID 的暴力穷举
func (m *Manager) Verify(id, code string) bool {
	return m.store.Verify(id, code, true)
}

// ExpireSeconds 返回验证码的有效期秒数
func (m *Manager) ExpireSeconds() int {
	return int(m.expiration.Seconds())
}
