import { Navigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUserInfoApi } from "@/api/system/auth";
import { useI18n } from "@/i18n";
import { clearSessionAndRedirectToLogin, invalidateRouter, syncRouterRoutes } from "@/router/session";
import { useUserStore } from "@/store";
import { Footer } from "./footer";
import { Header } from "./header";
import { Main } from "./main";
import { Sidebar } from "./sidebar";
import { TagsView } from "./tags-view";

export default function DashboardLayout() {
	const { t } = useI18n();
	const token = useUserStore((state) => state.token);
	const userInfo = useUserStore((state) => state.userInfo);
	const setUserInfo = useUserStore((state) => state.setUserInfo);
	const [loading, setLoading] = useState(false);
	const isNavigatingToLogin = useRouterState({
		select: (s) => s.location.pathname === "/login" || s.resolvedLocation?.pathname === "/login",
	});

	useEffect(() => {
		// 有 token 但没有 userInfo（如持久化数据不完整），自动获取
		if (token && !userInfo && !loading) {
			setLoading(true);
			// 记录获取前的 menus 状态
			const hadMenus = useUserStore.getState().menus.length > 0;
			getUserInfoApi()
				.then((info) => {
					setUserInfo(info);
					// 如果之前 menus 为空但现在有数据，运行时重建路由树并重新校验当前路由
					if (!hadMenus && info.menus?.length > 0) {
						syncRouterRoutes(info.menus);
						void invalidateRouter();
					}
				})
				.catch(() => {
					// 获取用户信息失败（token 过期等），清除登录状态并跳转登录页
					clearSessionAndRedirectToLogin();
				})
				.finally(() => {
					setLoading(false);
				});
		}
	}, [token, userInfo, loading, setUserInfo]);

	if (!token) {
		return isNavigatingToLogin ? null : <Navigate to="/login" replace />;
	}

	// 正在获取用户信息时显示加载状态
	if (!userInfo) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<span className="text-sm text-muted-foreground">{t("common.loading")}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen w-full overflow-hidden bg-background">
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0 bg-background">
				<Header />
				<TagsView />
				<Main />
				<Footer />
			</div>
		</div>
	);
}
