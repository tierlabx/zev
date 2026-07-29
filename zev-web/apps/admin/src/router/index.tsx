import { createRouter } from "@tanstack/react-router";
import { buildRouteTree } from "./routes";
import { useUserStore } from "@/store";

/**
 * 从持久化的 store 中读取菜单数据，构建完整路由树并创建 router
 *
 * 由于 zustand persist 在模块加载时同步恢复 localStorage 数据，
 * 这里可以同步获取到用户上次登录的菜单数据，实现动态路由。
 *
 * 登录/退出登录后通过 window.location.href 触发页面刷新，
 * 重新执行此模块，从而用新的菜单数据重建路由树。
 */
const menus = useUserStore.getState().menus;
const routeTree = buildRouteTree(menus);

export const router = createRouter({
	routeTree,
	defaultViewTransition: true,
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
