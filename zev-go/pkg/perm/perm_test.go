package perm

import (
	"slices"
	"testing"
)

func TestSplitAndNormalize(t *testing.T) {
	gotSplit := Split(" system:user:list , , system:user:create,system:user:list ")
	wantSplit := []string{"system:user:list", "system:user:create"}
	if !slices.Equal(gotSplit, wantSplit) {
		t.Fatalf("Split mismatch: got %v, want %v", gotSplit, wantSplit)
	}

	emptyNorm, err := Normalize("   ")
	if err != nil || emptyNorm != "" {
		t.Fatalf("expected empty normalize without error, got %q err=%v", emptyNorm, err)
	}

	norm, err := Normalize(" dashboard:view , system:user:list , dashboard:view ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if norm != "dashboard:view,system:user:list" {
		t.Fatalf("Normalize mismatch: got %q", norm)
	}

	invalidCases := []string{
		"single",
		"System:User:List",
		"system::list",
		"system:user:",
		"123:user:list",
		"system:user list",
	}
	for _, bad := range invalidCases {
		if _, err := Normalize(bad); err == nil {
			t.Fatalf("expected error for invalid permission %q, got nil", bad)
		}
	}
}

func TestHasAny(t *testing.T) {
	menuPerms := []string{"system:operlog:list,system:loginlog:list", "dashboard:view"}
	if !HasAny(menuPerms, []string{"system:loginlog:list"}) {
		t.Fatalf("expected HasAny to match split permission")
	}
	if !HasAny(menuPerms, []string{"system:user:list", "dashboard:view"}) {
		t.Fatalf("expected HasAny to match dashboard:view")
	}
	if HasAny(menuPerms, []string{"system:user:delete"}) {
		t.Fatalf("expected HasAny not to match missing permission")
	}
}

func TestRegisterAndRegistered(t *testing.T) {
	Register("testmod:alpha:list,testmod:beta:create", "testmod:alpha:view")
	all := Registered()
	for _, expected := range []string{"testmod:alpha:list", "testmod:beta:create", "testmod:alpha:view"} {
		if !slices.Contains(all, expected) {
			t.Fatalf("expected %q in Registered(), got %v", expected, all)
		}
	}
}
