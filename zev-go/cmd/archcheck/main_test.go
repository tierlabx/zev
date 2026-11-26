package main

import (
	"os"
	"path/filepath"
	"testing"
)

func writeTempGoFile(t *testing.T, root, relPath, content string) {
	t.Helper()
	full := filepath.Join(root, filepath.FromSlash(relPath))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		t.Fatalf("创建临时目录失败: %v", err)
	}
	if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
		t.Fatalf("写入临时文件失败: %v", err)
	}
}

func hasRule(violations []Violation, ruleID string) bool {
	for _, v := range violations {
		if v.RuleID == ruleID {
			return true
		}
	}
	return false
}

func TestArchcheckControllerRules(t *testing.T) {
	tmp := t.TempDir()

	writeTempGoFile(t, tmp, "modules/demo/controller/bad.go", `package controller

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BadReq struct {
	Name string
}

type BadController struct {
	DB *gorm.DB
}

func (c *BadController) Create(ctx *gin.Context) {
	_ = c.DB
	ctx.JSON(200, BadReq{Name: "x"})
}
`)

	violations, err := Run(tmp, "zev-go")
	if err != nil {
		t.Fatalf("Run 失败: %v", err)
	}

	for _, want := range []string{"GO-CTRL-NO-GORM", "GO-CTRL-NO-LOCAL-DTO", "GO-CTRL-USE-RESPONSE"} {
		if !hasRule(violations, want) {
			t.Fatalf("期望捕获规则 %s，实际违规列表: %+v", want, violations)
		}
	}
}

func TestArchcheckLayerDependencyAndAllowComment(t *testing.T) {
	tmp := t.TempDir()

	// entity 反向依赖 service 应拦截；dto 引入 gorm 应拦截；service 反向引用 controller 应拦截
	writeTempGoFile(t, tmp, "modules/alpha/entity/user.go", `package entity
import _ "zev-go/modules/alpha/service"
type User struct{}
`)
	writeTempGoFile(t, tmp, "modules/alpha/dto/user.go", `package dto
import _ "gorm.io/gorm"
type UserReq struct{}
`)
	writeTempGoFile(t, tmp, "modules/alpha/service/user.go", `package service
import _ "zev-go/modules/alpha/controller"
type UserService struct{}
`)
	// 跨模块引用 controller 应拦截
	writeTempGoFile(t, tmp, "modules/beta/service/sync.go", `package service
import _ "zev-go/modules/alpha/controller"
type SyncService struct{}
`)
	// 带有效 reason 的 harness:allow 应放行；无 reason 的不应放行
	writeTempGoFile(t, tmp, "modules/alpha/controller/ok.go", `package controller

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

type OkController struct{}

func (c *OkController) Export(ctx *gin.Context) {
	var b fmt.Stringer
	if b != nil {
		_ = b.String() // 无参 Stringer 不应被误判
	}
	// harness:allow GO-CTRL-USE-RESPONSE 演示自定义纯文本导出流
	ctx.String(200, "ok")
}

func (c *OkController) MissingReason(ctx *gin.Context) {
	// harness:allow GO-CTRL-USE-RESPONSE
	ctx.JSON(200, gin.H{"ok": true})
}
`)

	violations, err := Run(tmp, "zev-go")
	if err != nil {
		t.Fatalf("Run 失败: %v", err)
	}

	layerCount := 0
	respCount := 0
	for _, v := range violations {
		if v.RuleID == "GO-LAYER-DEPENDENCY" {
			layerCount++
		}
		if v.RuleID == "GO-CTRL-USE-RESPONSE" {
			respCount++
		}
	}

	if layerCount != 4 {
		t.Fatalf("期望 4 条 GO-LAYER-DEPENDENCY 违规，实际 %d: %+v", layerCount, violations)
	}
	if respCount != 1 {
		t.Fatalf("期望仅 MissingReason 触发 1 条 GO-CTRL-USE-RESPONSE，实际 %d: %+v", respCount, violations)
	}
}
