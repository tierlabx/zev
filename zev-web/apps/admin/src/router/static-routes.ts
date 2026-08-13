import { type AnyRoute, createRoute } from "@tanstack/react-router";
import type { MenuItem } from "@/api/interface/system/user";
import { componentMap } from "@/router/components";

/**
 * 构建固定的静态业务路由（这些路由通常不显示在动态菜单中，但必须存在）
 * 例如：个人中心、系统通知等页面
 *
 * @param parent 父级 TanStack Router 路由对象 (通常是 layoutRoute)
 * @param menus 后端动态菜单（用于去重检测）
 * @returns 路由对象数组
 */
export function buildStaticRoutes(parent: AnyRoute, menus: MenuItem[] = []): AnyRoute[] {
	const routes: AnyRoute[] = [];

	// 为了防止动态路由中已经配置了该路径导致 Duplicate routes 报错，这里做一下简易去重检查
	const flatMenusStr = JSON.stringify(menus);

	// ==========================================
	// 1. 个人中心页面
	// ==========================================
	const hasProfile = flatMenusStr.includes('"path":"/profile"') || flatMenusStr.includes('"path":"profile"');
	if (!hasProfile) {
		const profileRoute = createRoute({
			getParentRoute: () => parent,
			path: "/profile",
			component: componentMap["profile/index"] as never,
			staticData: { title: "个人中心" },
		});
		routes.push(profileRoute);
	}

	// ==========================================
	// 2. 其它静态路由可在此处继续追加...
	// ==========================================

	return routes;
}
