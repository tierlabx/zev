import { useUserStore } from "@/store";

/**
 * 权限控制 Hook
 *
 * 用法:
 *   const { hasPermission } = usePermission();
 *   if (hasPermission("system:user:create")) { ... }
 *
 *   // 多权限检查：满足任意一个即可
 *   const { hasAnyPermission } = usePermission();
 *   if (hasAnyPermission(["system:user:create", "system:user:update"])) { ... }
 *
 *   // 多权限检查：需要全部满足
 *   const { hasAllPermissions } = usePermission();
 *   if (hasAllPermissions(["system:user:create", "system:user:update"])) { ... }
 */
export function usePermission() {
	const permissions = useUserStore((state) => state.permissions);
	const userInfo = useUserStore((state) => state.userInfo);

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
		if (userInfo?.role_code === "super_admin" || userInfo?.role_code === "admin") return true;
		return userInfo?.role_code === role;
	};

	return {
		permissions,
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		hasRole,
	};
}
