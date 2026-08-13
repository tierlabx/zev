import type React from "react";
import { usePermission } from "@/hooks/use-permission";

interface AuthProps {
	permission?: string | string[];
	role?: string | string[];
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

export function Auth({ permission, role, children, fallback = null }: AuthProps) {
	const { hasPermission, hasRole } = usePermission();

	const checkAuth = () => {
		let isAuth = true;

		if (permission) {
			const permissions = Array.isArray(permission) ? permission : [permission];
			// 只要满足其中一个权限即有权限 (OR 逻辑)
			isAuth = isAuth && permissions.some(hasPermission);
		}

		if (role) {
			const roles = Array.isArray(role) ? role : [role];
			// 只要满足其中一个角色即有权限 (OR 逻辑)
			isAuth = isAuth && roles.some(hasRole);
		}

		return isAuth;
	};

	if (checkAuth()) {
		return <>{children}</>;
	}

	return <>{fallback}</>;
}
