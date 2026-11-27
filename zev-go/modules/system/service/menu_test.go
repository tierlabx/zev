package service

import (
	"testing"
)

func TestBuildPermTree(t *testing.T) {
	tree := BuildPermTree([]string{
		"system:user:list",
		"system:user:create",
		"system:role:assign",
		"dashboard:view",
		"agent:provider:list",
	})

	if len(tree) != 3 {
		t.Fatalf("expected 3 root groups, got %d (%+v)", len(tree), tree)
	}
	// 根节点按字母序排列：agent -> dashboard -> system
	if tree[0].Value != "agent" || tree[1].Value != "dashboard" || tree[2].Value != "system" {
		t.Fatalf("unexpected root order: %v, %v, %v", tree[0].Value, tree[1].Value, tree[2].Value)
	}

	// 验证两段权限 dashboard:view
	if len(tree[1].Children) != 1 || tree[1].Children[0].Key != "dashboard:view" {
		t.Fatalf("expected dashboard:view leaf, got %+v", tree[1].Children)
	}

	// 验证三段权限 system -> role / user
	sysChildren := tree[2].Children
	if len(sysChildren) != 2 || sysChildren[0].Value != "role" || sysChildren[1].Value != "user" {
		t.Fatalf("unexpected system children: %+v", sysChildren)
	}
	userOps := sysChildren[1].Children
	if len(userOps) != 2 || userOps[0].Value != "create" || userOps[0].Key != "system:user:create" {
		t.Fatalf("unexpected user ops: %+v", userOps)
	}
}
