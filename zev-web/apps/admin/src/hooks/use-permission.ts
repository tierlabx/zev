import { useUserStore } from "@/store";

/**
 * 权限控制 Hook（含按钮/菜单权限、多角色判断与当前数据权限元数据）
 */
export function usePermission() {
	const permissions = useUserStore((state) => state.permissions);
	const userInfo = useUserStore((state) => state.userInfo);

	const isSuperAdmin =
		permissions.includes("*") ||
		userInfo?.role_id === 1 ||
		userInfo?.role_code === "super_admin" ||
		userInfo?.role_code === "admin" ||
		Boolean(userInfo?.role_ids?.includes(1));

	const dataScope = isSuperAdmin ? 1 : (userInfo?.data_scope ?? 5);
	const deptId = userInfo?.dept_id ?? 0;
	const hasAllDataScope = isSuperAdmin || dataScope === 1;

	const hasPermission = (perm: string): boolean => {
		if (permissions.includes("*")) return true;
		return permissions.includes(perm);
	};

	const hasAnyPermission = (perms: string[]): boolean => {
		if (permissions.includes("*")) return true;
		return perms.some((p) => permissions.includes(p));
	};

	const hasAllPermissions = (perms: string[]): boolean => {
		if (permissions.includes("*")) return true;
		return perms.every((p) => permissions.includes(p));
	};

	const hasRole = (role: string): boolean => {
		if (isSuperAdmin) return true;
		if (userInfo?.role_code === role) return true;
		return Boolean(userInfo?.roles?.includes(role));
	};

	return {
		permissions,
		isSuperAdmin,
		dataScope,
		deptId,
		hasAllDataScope,
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		hasRole,
	};
}
