package jwtx

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	secretKey   = []byte("zev-admin-secret-key-development")
	expireHours = 24
)

// Init 使用配置初始化 JWT 密钥和过期时间，应在应用启动时调用。
func Init(secret string, hours int) {
	if secret != "" {
		secretKey = []byte(secret)
	}
	if hours > 0 {
		expireHours = hours
	}
}

type CustomClaims struct {
	UserID   uint   `json:"user_id"`
	RoleID   uint   `json:"role_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// GenerateToken 生成 Token
func GenerateToken(userID uint, username string, roleID uint) (string, error) {
	claims := CustomClaims{
		UserID:   userID,
		RoleID:   roleID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   username,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secretKey)
}

// ParseToken 解析 token
func ParseToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		return secretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, err
}
