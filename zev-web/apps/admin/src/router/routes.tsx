import {
	type AnyRoute,
	Outlet,
	createRootRoute,
	createRoute,
	redirect,
} from "@tanstack/react-router";
import App from "@/App";
import type { MenuItem } from "@/api/interface/system/user";
import { findFirstPagePath } from "@/lib/menu-utils";
import DashboardLayout from "@/layouts/dashboard";
import Login from "@/pages/Login";
import { componentMap, NotFoundComponent } from "@/router/components";
import { useUserStore } from "@/store";

// ============================================================
//  Base Routes（固定路由：root / login / layout）
// ============================================================

export const rootRoute = createRootRoute({
	component: () => (
		<App>
			<Outlet />
		</App>
	),
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	beforeLoad: () => {
		const { token, menus } = useUserStore.getState();
		// 只有 token 和 menus 同时存在才算已登录，跳转到第一个可用页面
		if (token && menus.length > 0) {
			const firstPage = findFirstPagePath(menus);
			if (firstPage) {
				throw redirect({ to: firstPage as never });
			}
		}
		// token 存在但 menus 为空（持久化数据不完整），清除 token 让用户重新登录
		if (token && menus.length === 0) {
			useUserStore.getState().logout();
		}
	},
	component: Login,
});

const layoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "_layout",
	component: DashboardLayout,
	beforeLoad: () => {
		const token = useUserStore.getState().token;
		if (!token) {
			throw redirect({ to: "/login" });
		}
	},
});

// ============================================================
//  Dynamic Route Generator（从后端菜单数据生成路由）
// ============================================================

/**
 * 规范化路由路径：确保以 / 开头
 */
function normalizePath(path: string): string {
	if (!path) return "/";
	return path.startsWith("/") ? path : `/${path}`;
}

/**
 * 拼接父子路径生成完整 URL 路径
 */
function joinPath(parentPath: string, childPath: string): string {
	const normalized = normalizePath(childPath);
	return `${parentPath}${normalized}`.replace(/\/+/g, "/");
}

/**
 * 递归构建动态路由
 *
 * @param menus    后端菜单树（已按角色过滤）
 * @param parent   父级 TanStack Router 路由对象
 * @param accumulatedPath 累积的完整路径前缀（用于 index 重定向）
 * @returns 路由对象数组
 */
function buildDynamicRoutes(
	menus: MenuItem[],
	parent: AnyRoute,
	accumulatedPath = "",
): AnyRoute[] {
	// 过滤 M/C 类型并按 sort 排序
	const validMenus = [...menus]
		.filter((m) => m.type === "M" || m.type === "C")
		.sort((a, b) => a.sort - b.sort);

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

/**
 * 构建 404 兜底路由（作为 layout 的子路由）
 */
function buildNotFoundRoute(parent: AnyRoute): AnyRoute {
	return createRoute({
		getParentRoute: () => parent,
		path: "/404",
		component: NotFoundComponent as never,
		staticData: { title: "页面未找到" },
	});
}

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

	// 3. 404 路由
	layoutChildren.push(buildNotFoundRoute(layoutRoute));

	// 组装 layout 路由（含子路由）
	const layoutWithChildren = layoutRoute.addChildren(layoutChildren);

	// Splat 兜底路由：未匹配的路径重定向
	const splatRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "$",
		beforeLoad: () => {
			const { token, menus: currentMenus } = useUserStore.getState();
			if (!token || currentMenus.length === 0) {
				throw redirect({ to: "/login" });
			}
			const first = findFirstPagePath(currentMenus);
			if (first) {
				throw redirect({ to: first as never });
			}
			throw redirect({ to: "/login" });
		},
	});

	// 组装完整路由树
	return rootRoute.addChildren([loginRoute, layoutWithChildren, splatRoute]);
}
