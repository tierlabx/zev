import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false, // 默认不在窗口聚焦时重新请求
			retry: 1, // 失败后重试次数
			staleTime: 5 * 60 * 1000, // 数据 5 分钟内认为是新鲜的，不会自动 refetch
		},
	},
});
