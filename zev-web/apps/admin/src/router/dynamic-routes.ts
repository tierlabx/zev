import { type AnyRoute, createRoute, redirect } from "@tanstack/react-router";
import type { MenuItem } from "@/api/interface/system/user";
import { componentMap, NotFoundComponent } from "@/router/components";
import { findFirstPagePath, joinPath, normalizePath } from "@/utils/menu-utils";

/**
 * 构建 404 兜底路由（作为 layout 的子路由）
 */
export function buildNotFoundRoute(parent: AnyRoute): AnyRoute {
	return createRoute({
		getParentRoute: () => parent,
		path: "/404",
		component: NotFoundComponent as never,
		staticData: { title: "页面未找到" },
	});
}

/**
 * 递归构建动态路由
 *
 * @param menus    后端菜单树（已按角色过滤）
 * @param parent   父级 TanStack Router 路由对象
 * @param accumulatedPath 累积的完整路径前缀（用于 index 重定向）
 * @returns 路由对象数组
 */
export function buildDynamicRoutes(menus: MenuItem[], parent: AnyRoute, accumulatedPath = ""): AnyRoute[] {
	// 过滤 M/C 类型并按 sort 排序
	const validMenus = [...menus].filter((m) => m.type === "M" || m.type === "C").sort((a, b) => a.sort - b.sort);

	const routes: AnyRoute[] = [];

	for (const menu of validMenus) {
		const routePath = normalizePath(menu.path);
		const fullPath = joinPath(accumulatedPath, menu.path);

		if (menu.type === "M" && menu.children?.some((c) => c.type === "M" || c.type === "C")) {
			// --- 目录类型 (M)：创建父路由，递归添加子路由 ---

			const dirRoute = createRoute({
				getParentRoute: () => parent,
				path: routePath,
				staticData: { title: menu.name },
			});

			const childRoutes = buildDynamicRoutes(menu.children, dirRoute, fullPath);

			// 查找第一个子页面路径用于 index 重定向
			const firstChildPath = findFirstPagePath(menu.children, fullPath);

			const allChildren: AnyRoute[] = [];

			// 添加 index 路由（访问目录根路径时重定向到第一个子页面）
			if (firstChildPath) {
				const indexRoute = createRoute({
					getParentRoute: () => dirRoute,
					path: "/",
					beforeLoad: () => {
						throw redirect({ to: firstChildPath as never });
					},
				});
				allChildren.push(indexRoute);
			}

			allChildren.push(...childRoutes);
			dirRoute.addChildren(allChildren);
			routes.push(dirRoute);
		} else if (menu.type === "C") {
			// --- 菜单类型 (C)：创建带组件的路由 ---

			const Component = menu.component ? componentMap[menu.component] : undefined;

			const route = createRoute({
				getParentRoute: () => parent,
				path: routePath,
				component: (Component ?? NotFoundComponent) as never,
				staticData: {
					title: menu.name,
					perms: menu.perms || undefined,
				},
			});
			routes.push(route);
		}
	}

	return routes;
}
