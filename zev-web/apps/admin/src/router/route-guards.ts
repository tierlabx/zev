import { redirect } from "@tanstack/react-router";
import { componentMap } from "@/router/components";
import { useUserStore } from "@/store";
import { findFirstPagePath } from "@/utils/menu-utils";

/**
 * 从前端组件映射表自动推导系统受保护的已知页面与目录路径集合，
 * 用于在用户已登录但路由未命中时区分「无权访问 (403)」与「页面不存在 (404)」。
 */
const KNOWN_PAGE_PATHS = new Set(
	Object.keys(componentMap).map((key) => {
		const trimmed = key.endsWith("/index") ? key.slice(0, -"/index".length) : key;
		return `/${trimmed}`;
	}),
);

const KNOWN_DIR_PATHS = new Set(
	Array.from(KNOWN_PAGE_PATHS)
		.map((pagePath) => {
			const idx = pagePath.lastIndexOf("/");
			return idx > 0 ? pagePath.slice(0, idx) : "";
		})
		.filter(Boolean),
);

function normalizePathname(pathname: string): string {
	if (!pathname) return "/";
	return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function isKnownProtectedPath(pathname: string): boolean {
	const normalized = normalizePathname(pathname);
	if (KNOWN_PAGE_PATHS.has(normalized) || KNOWN_DIR_PATHS.has(normalized)) {
		return true;
	}
	return Array.from(KNOWN_PAGE_PATHS).some((known) => normalized.startsWith(`${known}/`));
}

/**
 * 登录页守卫
 * 只有 token 和 menus 同时存在才算已登录，跳转到第一个可用页面
 * token 存在但 menus 为空（持久化数据不完整），清除 token 让用户重新登录
 */
export const loginBeforeLoad = () => {
	const { token, menus } = useUserStore.getState();
	if (token && menus.length > 0) {
		const firstPage = findFirstPagePath(menus);
		if (firstPage) {
			throw redirect({ to: firstPage as never });
		}
	}
	if (token && menus.length === 0) {
		useUserStore.getState().logout();
	}
};

/**
 * 布局页守卫 (拦截需要鉴权的页面)
 * 校验 token 是否存在
 */
export const layoutBeforeLoad = () => {
	const token = useUserStore.getState().token;
	if (!token) {
		throw redirect({ to: "/login" });
	}
};

/**
 * 根路径/未匹配路径兜底守卫
 * 未登录跳转登录页；已登录时区分系统已定义但无权限的路由（403）与完全不存在的路径（404）
 */
export const splatBeforeLoad = ({ location }: { location: { pathname: string } }) => {
	const { token, menus: currentMenus } = useUserStore.getState();
	if (!token || currentMenus.length === 0) {
		throw redirect({ to: "/login", replace: true });
	}
	const normalizedPath = normalizePathname(location.pathname);
	if (isKnownProtectedPath(normalizedPath)) {
		throw redirect({
			to: "/403",
			search: { from: normalizedPath } as never,
			replace: true,
		});
	}
	throw redirect({ to: "/404", replace: true });
};
