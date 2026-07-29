import axios, { type AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { useUserStore } from "@/store";

const service = axios.create({
	baseURL: "/api",
	timeout: 10000,
});

// 请求拦截
service.interceptors.request.use((config) => {
	const token = useUserStore.getState().token;
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// 响应拦截
service.interceptors.response.use(
	(response) => {
		const res = response.data;
		// 后端统一返回格式 { code, msg, data }
		if (res.code !== 200) {
			if (res.code === 401) {
				useUserStore.getState().logout();
				// 使用 window.location.href 而非 router.navigate，
				// 确保路由树从清空后的 store 重建
				window.location.href = "/login";
			} else if (res.code === 403) {
				toast.error("权限不足，无法执行此操作");
			} else {
				toast.error(res.msg || "Error");
			}
			return Promise.reject(new Error(res.msg || "Error"));
		}
		return res.data;
	},
	(error) => {
		const status = error.response?.status;

		if (status === 401) {
			useUserStore.getState().logout();
			window.location.href = "/login";
		} else if (status === 403) {
			toast.error("权限不足，无法执行此操作");
		} else if (status === 400) {
			toast.error(error.response?.data?.msg || "参数错误");
		} else if (status === 404) {
			toast.error("请求的资源不存在");
		} else if (status === 500) {
			toast.error("服务器异常，请稍后重试");
		} else if (error.code === "ECONNABORTED") {
			toast.error("请求超时，请重试");
		} else if (error.message === "Network Error" || !error.response) {
			toast.error("网络连接异常，请检查网络");
		} else {
			toast.error(error.message || "请求失败");
		}

		return Promise.reject(error);
	},
);

const request = {
	get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
		return service.get(url, config);
	},
	post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
		return service.post(url, data, config);
	},
	put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
		return service.put(url, data, config);
	},
	delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
		return service.delete(url, config);
	},
};

export default request;
