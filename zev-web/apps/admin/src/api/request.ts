import axios, { type AxiosRequestConfig } from "axios";
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
			}
			return Promise.reject(new Error(res.msg || "Error"));
		}
		return res.data;
	},
	(error) => {
		if (error.response?.status === 401) {
			useUserStore.getState().logout();
			window.location.href = "/login";
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
