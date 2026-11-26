package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
)

const devFallbackSecret = "zev-agent-dev-secret-key"
const defaultJWTDevSecret = "zev-admin-secret-key-development"

var devKeyWarnOnce sync.Once

// ValidateProductionSecret 在 release 生产模式下校验是否显式配置了安全的加密密钥，禁止回退到开发默认串
func ValidateProductionSecret() error {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("GIN_MODE")), "release") {
		return nil
	}
	if strings.TrimSpace(os.Getenv("AGENT_SECRET_KEY")) != "" {
		return nil
	}
	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if jwtSecret != "" && jwtSecret != defaultJWTDevSecret {
		return nil
	}
	return errors.New("生产模式 (GIN_MODE=release) 必须显式配置 AGENT_SECRET_KEY（或非默认 JWT_SECRET）以保护模型供应商 API Key")
}

// deriveKey 将环境变量中的密钥派生为固定 32 字节 AES-256 密钥，避免运维配置长度不足导致启动失败
func deriveKey(secret string) []byte {
	s := strings.TrimSpace(secret)
	if s == "" {
		s = strings.TrimSpace(os.Getenv("AGENT_SECRET_KEY"))
	}
	if s == "" {
		s = strings.TrimSpace(os.Getenv("JWT_SECRET"))
	}
	if s == "" {
		devKeyWarnOnce.Do(func() {
			slog.Warn("AGENT_SECRET_KEY 与 JWT_SECRET 均未配置，当前回退使用开发环境内置密钥，请勿用于生产环境")
		})
		s = devFallbackSecret
	}
	sum := sha256.Sum256([]byte(s))
	return sum[:]
}

// Encrypt 使用 AES-256-GCM 加密敏感凭据（如模型供应商 API Key）并返回 Base64 密文
func Encrypt(plaintext, secret string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	block, err := aes.NewCipher(deriveKey(secret))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt 解密 AES-256-GCM 加密的凭据
func Decrypt(ciphertext, secret string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}
	raw, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(deriveKey(secret))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("密文长度不合法")
	}
	nonce, body := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	plain, err := gcm.Open(nil, nonce, body, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

// MaskSecret 对 API Key 做安全脱敏展示，仅保留少量首尾字符便于管理员核对
func MaskSecret(secret string) string {
	s := strings.TrimSpace(secret)
	if s == "" {
		return ""
	}
	runes := []rune(s)
	if len(runes) <= 8 {
		return "****"
	}
	return string(runes[:4]) + "****" + string(runes[len(runes)-4:])
}
