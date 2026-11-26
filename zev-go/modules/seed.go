package modules

import (
	"slices"
	"strings"
	"sync"
)

// SeedSource 描述一个业务模块向系统种子引导器注册的初始化数据文件
type SeedSource struct {
	Module string
	Path   string
}

var (
	seedMu       sync.RWMutex
	seedRegistry []SeedSource
)

// RegisterSeed 由各业务模块在 init() 中声明自身的 seed.json 路径，实现零侵入模块化种子装配
func RegisterSeed(module, path string) {
	mod := strings.TrimSpace(module)
	p := strings.TrimSpace(path)
	if mod == "" || p == "" {
		return
	}
	seedMu.Lock()
	defer seedMu.Unlock()
	for i, item := range seedRegistry {
		if item.Module == mod {
			seedRegistry[i].Path = p
			return
		}
	}
	seedRegistry = append(seedRegistry, SeedSource{Module: mod, Path: p})
}

// RegisteredSeeds 返回按确定性顺序排列的模块种子清单（system 始终位于首位，其余按模块名升序）
func RegisteredSeeds() []SeedSource {
	seedMu.RLock()
	out := make([]SeedSource, len(seedRegistry))
	copy(out, seedRegistry)
	seedMu.RUnlock()

	slices.SortFunc(out, func(a, b SeedSource) int {
		if a.Module == "system" && b.Module != "system" {
			return -1
		}
		if b.Module == "system" && a.Module != "system" {
			return 1
		}
		return strings.Compare(a.Module, b.Module)
	})
	return out
}
