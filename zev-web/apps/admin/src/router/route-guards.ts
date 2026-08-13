import { redirect } from "@tanstack/react-router";
import { useUserStore } from "@/store";
import { findFirstPagePath } from "@/utils/menu-utils";

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
 * 校验用户登录状态并重定向到首个可用页面或登录页
 */
export const splatBeforeLoad = () => {
	const { token, menus: currentMenus } = useUserStore.getState();
	if (!token || currentMenus.length === 0) {
		throw redirect({ to: "/login" });
	}
	const first = findFirstPagePath(currentMenus);
	if (first) {
		throw redirect({ to: first as never });
	}
	throw redirect({ to: "/login" });
};
