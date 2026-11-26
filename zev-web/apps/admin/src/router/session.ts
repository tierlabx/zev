import type { MenuItem } from "@/api/interface/system/user";
import { queryClient } from "@/api/queryClient";
import { useUserStore } from "@/store";
import { useTagsStore } from "@/store/tags";
import { getFrontendRouteOptions } from "@/utils/menu-utils";

export interface RouterBridge {
	updateMenus: (menus: MenuItem[]) => void;
	navigateToLogin: () => Promise<void>;
	invalidate: () => Promise<void>;
}

let routerBridge: RouterBridge | null = null;

/**
 * 由 router/index.tsx 在创建实例后注册运行时桥接能力，
 * 避免 api/request、layouts、pages 与 router 实例之间形成循环依赖。
 */
export function registerRouterBridge(bridge: RouterBridge): void {
	routerBridge = bridge;
}

/**
 * 运行时用最新菜单重建 TanStack Router 路由树（无需整页刷新），并裁剪无权访问的残留标签页
 */
export function syncRouterRoutes(menus: MenuItem[]): void {
	if (menus.length === 0) {
		useTagsStore.getState().resetViews();
	} else {
		const allowedPaths = new Set(getFrontendRouteOptions(menus).map((item) => item.path));
		useTagsStore.getState().pruneViews(allowedPaths);
	}
	routerBridge?.updateMenus(menus);
}

/**
 * 触发当前路由重新校验与加载
 */
export function invalidateRouter(): Promise<void> {
	return routerBridge?.invalidate() ?? Promise.resolve();
}

/**
 * 清空当前登录会话（用户凭证、标签页缓存、Query 缓存、动态路由）并无刷新跳转至登录页。
 * 具备幂等保护，防止并发请求返回 401 时重复触发跳转。
 */
export function clearSessionAndRedirectToLogin(): void {
	const alreadyAtLogin = typeof window !== "undefined" && window.location.pathname === "/login";
	if (!useUserStore.getState().token && alreadyAtLogin) {
		return;
	}

	useUserStore.getState().logout();
	useTagsStore.getState().resetViews();
	queryClient.clear();
	syncRouterRoutes([]);

	if (routerBridge) {
		void routerBridge.navigateToLogin();
	} else if (typeof window !== "undefined" && !alreadyAtLogin) {
		window.location.replace("/login");
	}
}
