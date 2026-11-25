import { createRouter } from "@tanstack/react-router";
import { useUserStore } from "@/store";
import { buildRouteTree } from "./routes";
import { registerRouterBridge } from "./session";

/**
 * 从持久化的 store 中读取菜单数据，构建完整路由树并创建 router。
 *
 * 由于 zustand persist 在模块加载时同步恢复 localStorage 数据，
 * 初始化时即可拿到上次持久化的菜单数据。
 * 登录/退出登录时通过 router.update({ routeTree }) 在运行时动态重建路由树，
 * 实现无刷新平滑切换。
 */
const menus = useUserStore.getState().menus;
const routeTree = buildRouteTree(menus);

export const router = createRouter({
	routeTree,
	defaultViewTransition: true,
});

registerRouterBridge({
	updateMenus: (nextMenus) => {
		router.update({ routeTree: buildRouteTree(nextMenus) });
	},
	navigateToLogin: () => router.navigate({ to: "/login", replace: true }),
	invalidate: () => router.invalidate(),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
	interface StaticDataRouteOption {
		title?: string;
		perms?: string;
	}
}
