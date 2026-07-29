import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUserInfoApi } from "@/api/system/auth";
import { useUserStore } from "@/store";
import { Header } from "./header";
import { Main } from "./main";
import { Sidebar } from "./sidebar";
import { TagsView } from "./tags-view";

export default function DashboardLayout() {
	const token = useUserStore((state) => state.token);
	const userInfo = useUserStore((state) => state.userInfo);
	const setUserInfo = useUserStore((state) => state.setUserInfo);
	const logout = useUserStore((state) => state.logout);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// 有 token 但没有 userInfo（如页面刷新），自动获取
		if (token && !userInfo && !loading) {
			setLoading(true);
			getUserInfoApi()
				.then((info) => {
					setUserInfo(info);
				})
				.catch(() => {
					// 获取用户信息失败（token 过期等），清除登录状态
					logout();
				})
				.finally(() => {
					setLoading(false);
				});
		}
	}, [token, userInfo, loading, setUserInfo, logout]);

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	// 正在获取用户信息时显示加载状态
	if (!userInfo) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-[#F0F2F5]">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
					<span className="text-sm text-muted-foreground">加载中...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen w-full overflow-hidden bg-white">
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0 bg-[#F0F2F5]">
				<Header />
				<TagsView />
				<Main />
			</div>
		</div>
	);
}
