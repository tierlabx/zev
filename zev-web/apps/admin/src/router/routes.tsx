import { type AnyRoute, createRootRoute, createRoute, Outlet, redirect } from "@tanstack/react-router";
import App from "@/App";
import type { MenuItem } from "@/api/interface/system/user";
import DashboardLayout from "@/layouts/dashboard";
import Login from "@/pages/Login";

import { buildDynamicRoutes, buildNotFoundRoute } from "@/router/dynamic-routes";
import { layoutBeforeLoad, loginBeforeLoad, splatBeforeLoad } from "@/router/route-guards";
import { buildStaticRoutes } from "@/router/static-routes";
import { findFirstPagePath } from "@/utils/menu-utils";

// ============================================================
//  Route Tree Builder（组装完整路由树）
// ============================================================

/**
 * 根据后端菜单数据构建完整的路由树
 *
 * 调用时机：
 * 1. 模块加载时 —— 从 zustand persist 读取持久化的菜单数据
 * 2. 登录后页面刷新 —— store 已更新，路由树包含完整动态路由
 * 3. 退出后页面刷新 —— store 已清空，路由树仅包含 login
 *
 * @param menus 后端返回的菜单树（已按角色过滤）
 * @returns 完整的 TanStack Router 路由树
 */
export function buildRouteTree(menus: MenuItem[] = []) {
	const rootRoute = createRootRoute({
		component: () => (
			<App>
				<Outlet />
			</App>
		),
	});

	const loginRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/login",
		beforeLoad: loginBeforeLoad,
		component: Login,
	});

	const layoutRoute = createRoute({
		getParentRoute: () => rootRoute,
		id: "_layout",
		component: DashboardLayout,
		beforeLoad: layoutBeforeLoad,
	});

	// 构建 layout 的子路由
	const layoutChildren: AnyRoute[] = [];

	// 1. Index 路由：访问 / 时重定向到第一个可用页面
	const firstPage = findFirstPagePath(menus);
	if (firstPage) {
		const indexRoute = createRoute({
			getParentRoute: () => layoutRoute,
			path: "/",
			beforeLoad: () => {
				throw redirect({ to: firstPage as never });
			},
		});
		layoutChildren.push(indexRoute);
	}

	// 2. 动态生成的业务路由
	const dynamicRoutes = buildDynamicRoutes(menus, layoutRoute);
	layoutChildren.push(...dynamicRoutes);

	// 2.5 固定的静态业务路由（例如从不显示在菜单中，但必须存在的页面）
	const staticRoutes = buildStaticRoutes(layoutRoute, menus);
	layoutChildren.push(...staticRoutes);

	// 3. 404 路由
	layoutChildren.push(buildNotFoundRoute(layoutRoute));

	// 组装 layout 路由（含子路由）
	const layoutWithChildren = layoutRoute.addChildren(layoutChildren);

	// Splat 兜底路由：未匹配的路径重定向
	const splatRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "$",
		beforeLoad: splatBeforeLoad,
	});

	// 组装完整路由树
	return rootRoute.addChildren([loginRoute, layoutWithChildren, splatRoute]);
}
