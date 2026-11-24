package datascope

import (
	"reflect"
	"testing"
)

func TestIsValidScope(t *testing.T) {
	cases := []struct {
		scope int
		want  bool
	}{
		{0, false},
		{ScopeAll, true},
		{ScopeCustom, true},
		{ScopeDept, true},
		{ScopeDeptAndChild, true},
		{ScopeSelf, true},
		{6, false},
		{-1, false},
	}

	for _, tc := range cases {
		if got := IsValidScope(tc.scope); got != tc.want {
			t.Fatalf("IsValidScope(%d) = %v, want %v", tc.scope, got, tc.want)
		}
	}
}

func TestCollectDeptAndChildren_AncestorsBoundary(t *testing.T) {
	depts := []DeptNode{
		{ID: 1, ParentID: 0, Ancestors: "0"},
		{ID: 2, ParentID: 1, Ancestors: "0,1"},
		{ID: 5, ParentID: 2, Ancestors: "0,1,2"},
		{ID: 10, ParentID: 0, Ancestors: "0"},
		{ID: 12, ParentID: 10, Ancestors: "0,10"},
		{ID: 15, ParentID: 12, Ancestors: "0,10,12"},
	}

	// 验证 "0,1" 前缀不会误匹配 "0,10" 及其子部门
	gotRoot1 := CollectDeptAndChildren(1, depts)
	wantRoot1 := []uint{1, 2, 5}
	if !reflect.DeepEqual(gotRoot1, wantRoot1) {
		t.Fatalf("CollectDeptAndChildren(1) = %v, want %v", gotRoot1, wantRoot1)
	}

	gotRoot10 := CollectDeptAndChildren(10, depts)
	wantRoot10 := []uint{10, 12, 15}
	if !reflect.DeepEqual(gotRoot10, wantRoot10) {
		t.Fatalf("CollectDeptAndChildren(10) = %v, want %v", gotRoot10, wantRoot10)
	}

	gotLeaf := CollectDeptAndChildren(5, depts)
	wantLeaf := []uint{5}
	if !reflect.DeepEqual(gotLeaf, wantLeaf) {
		t.Fatalf("CollectDeptAndChildren(5) = %v, want %v", gotLeaf, wantLeaf)
	}
}

func TestMergeScopes_FiveLevelsAndUnion(t *testing.T) {
	depts := []DeptNode{
		{ID: 1, ParentID: 0, Ancestors: "0"},
		{ID: 2, ParentID: 1, Ancestors: "0,1"},
		{ID: 3, ParentID: 2, Ancestors: "0,1,2"},
		{ID: 4, ParentID: 1, Ancestors: "0,1"},
	}

	t.Run("无有效角色时默认拒绝", func(t *testing.T) {
		scope := MergeScopes(8, 2, nil, depts)
		if scope.AllData || scope.IsSuperAdmin || len(scope.DeptIDs) != 0 || scope.IncludeSelf || scope.DataScope != 0 {
			t.Fatalf("expected deny-all scope, got %+v", scope)
		}
		if CanAccessRecord(scope, 2, 8) || CanAccessDept(scope, 2) {
			t.Fatalf("empty scope must deny all record and dept access")
		}
	})

	t.Run("超管角色放行全量", func(t *testing.T) {
		scope := MergeScopes(1, 1, []RoleScopeInput{
			{RoleID: 1, RoleCode: "admin", DataScope: ScopeSelf},
		}, depts)
		if !scope.IsSuperAdmin || !scope.AllData || scope.DataScope != ScopeAll {
			t.Fatalf("super admin must get full data scope, got %+v", scope)
		}
	})

	t.Run("全部数据权限(ScopeAll)", func(t *testing.T) {
		scope := MergeScopes(2, 2, []RoleScopeInput{
			{RoleID: 2, RoleCode: "auditor", DataScope: ScopeAll},
		}, depts)
		if !scope.AllData || scope.DataScope != ScopeAll {
			t.Fatalf("expected AllData=true, got %+v", scope)
		}
	})

	t.Run("自定义数据权限(ScopeCustom)", func(t *testing.T) {
		scope := MergeScopes(3, 2, []RoleScopeInput{
			{RoleID: 3, RoleCode: "hr", DataScope: ScopeCustom, CustomDeptIDs: []uint{4, 2, 4}},
		}, depts)
		want := []uint{2, 4}
		if !reflect.DeepEqual(scope.DeptIDs, want) || scope.DataScope != ScopeCustom || scope.IncludeSelf {
			t.Fatalf("unexpected custom scope: %+v", scope)
		}
	})

	t.Run("本部门数据权限(ScopeDept)", func(t *testing.T) {
		scope := MergeScopes(4, 2, []RoleScopeInput{
			{RoleID: 4, RoleCode: "leader", DataScope: ScopeDept},
		}, depts)
		want := []uint{2}
		if !reflect.DeepEqual(scope.DeptIDs, want) || scope.DataScope != ScopeDept {
			t.Fatalf("unexpected dept scope: %+v", scope)
		}
	})

	t.Run("本部门及以下数据权限(ScopeDeptAndChild)", func(t *testing.T) {
		scope := MergeScopes(5, 2, []RoleScopeInput{
			{RoleID: 5, RoleCode: "manager", DataScope: ScopeDeptAndChild},
		}, depts)
		want := []uint{2, 3}
		if !reflect.DeepEqual(scope.DeptIDs, want) || scope.DataScope != ScopeDeptAndChild {
			t.Fatalf("unexpected dept_and_child scope: %+v", scope)
		}
	})

	t.Run("仅本人数据权限(ScopeSelf)", func(t *testing.T) {
		scope := MergeScopes(6, 2, []RoleScopeInput{
			{RoleID: 6, RoleCode: "common", DataScope: ScopeSelf},
		}, depts)
		if !scope.IncludeSelf || len(scope.DeptIDs) != 0 || scope.DataScope != ScopeSelf {
			t.Fatalf("unexpected self scope: %+v", scope)
		}
	})

	t.Run("多角色并集：自定义 + 仅本人", func(t *testing.T) {
		scope := MergeScopes(7, 2, []RoleScopeInput{
			{RoleID: 3, RoleCode: "custom", DataScope: ScopeCustom, CustomDeptIDs: []uint{4}},
			{RoleID: 6, RoleCode: "common", DataScope: ScopeSelf},
		}, depts)
		want := []uint{4}
		if !reflect.DeepEqual(scope.DeptIDs, want) || !scope.IncludeSelf || scope.DataScope != ScopeCustom {
			t.Fatalf("unexpected union custom+self scope: %+v", scope)
		}
		if !CanAccessRecord(scope, 4, 999) {
			t.Fatalf("expected access to custom dept 4")
		}
		if !CanAccessRecord(scope, 1, 7) {
			t.Fatalf("expected access to self record user=7")
		}
		if CanAccessRecord(scope, 2, 999) {
			t.Fatalf("must deny record in unassigned dept 2 owned by other user")
		}
	})

	t.Run("多角色并集：本部门 + 全部数据 -> 取全部", func(t *testing.T) {
		scope := MergeScopes(8, 2, []RoleScopeInput{
			{RoleID: 4, RoleCode: "dept", DataScope: ScopeDept},
			{RoleID: 9, RoleCode: "all", DataScope: ScopeAll},
		}, depts)
		if !scope.AllData || scope.DataScope != ScopeAll {
			t.Fatalf("expected union with ScopeAll to produce AllData, got %+v", scope)
		}
	})
}

func TestCanAccess_AntiHorizontalPrivilegeEscalation(t *testing.T) {
	if CanAccessRecord(nil, 1, 1) || CanAccessDept(nil, 1) {
		t.Fatalf("nil scope must deny access")
	}

	selfScope := &Scope{UserID: 10, DeptID: 2, IncludeSelf: true, DataScope: ScopeSelf}
	if !CanAccessRecord(selfScope, 99, 10) {
		t.Fatalf("self scope should allow own record")
	}
	if CanAccessRecord(selfScope, 2, 11) {
		t.Fatalf("self scope must deny same-dept other user record")
	}
	if CanAccessDept(selfScope, 2) {
		t.Fatalf("self scope must deny managing department 2")
	}

	deptScope := &Scope{UserID: 10, DeptID: 2, DeptIDs: []uint{2, 3}, DataScope: ScopeDeptAndChild}
	if !CanAccessDept(deptScope, 3) || !CanAccessRecord(deptScope, 3, 99) {
		t.Fatalf("dept scope should allow child dept 3")
	}
	if CanAccessDept(deptScope, 4) || CanAccessRecord(deptScope, 4, 10) {
		t.Fatalf("dept scope without IncludeSelf must deny outside dept 4 even if targetUserID matches")
	}
}
