package perm

import (
	"errors"
	"regexp"
	"slices"
	"strings"
	"sync"
)

// permPattern 约束权限标识为至少两段的冒号分隔小写标识符（如 system:user:list、dashboard:view）
var permPattern = regexp.MustCompile(`^[a-z][a-z0-9_-]*(:[a-z0-9_-]+)+$`)

var (
	registryMu sync.RWMutex
	registry   = make(map[string]struct{})
)

// Register 将一个或多个权限标识（支持逗号分隔）纳入全局注册表
func Register(perms ...string) {
	if len(perms) == 0 {
		return
	}
	registryMu.Lock()
	defer registryMu.Unlock()
	for _, raw := range perms {
		for _, p := range Split(raw) {
			registry[p] = struct{}{}
		}
	}
}

// Registered 返回已注册权限的去重排序切片
func Registered() []string {
	registryMu.RLock()
	defer registryMu.RUnlock()
	out := make([]string, 0, len(registry))
	for p := range registry {
		out = append(out, p)
	}
	slices.Sort(out)
	return out
}

// Split 按英文逗号拆分权限串，自动去除空白并保持原有顺序去重
func Split(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	seen := make(map[string]struct{}, len(parts))
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

// Normalize 校验并规范化权限标识串（单选或多选逗号分隔）；空串原样返回
func Normalize(raw string) (string, error) {
	if strings.TrimSpace(raw) == "" {
		return "", nil
	}
	items := Split(raw)
	if len(items) == 0 {
		return "", nil
	}
	for _, item := range items {
		if !permPattern.MatchString(item) {
			return "", errors.New("权限标识格式无效，请使用冒号分段格式（如 system:user:list）")
		}
	}
	return strings.Join(items, ","), nil
}

// HasAny 判断一组菜单权限串（支持单值或逗号分隔多值）中是否命中任一 required 权限
func HasAny(rawPermsList []string, required []string) bool {
	if len(rawPermsList) == 0 || len(required) == 0 {
		return false
	}
	reqSet := make(map[string]struct{}, len(required))
	for _, r := range required {
		for _, item := range Split(r) {
			reqSet[item] = struct{}{}
		}
	}
	if len(reqSet) == 0 {
		return false
	}
	for _, raw := range rawPermsList {
		for _, p := range Split(raw) {
			if _, ok := reqSet[p]; ok {
				return true
			}
		}
	}
	return false
}
