import axios, { type AxiosRequestConfig } from "axios";
import { router } from "@/router";
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
		// 后端有统一返回格式： E:\code\Go\zev\zev-go\pkg\response 在这里
		if (res.code !== 200) {
			if (res.code === 401) {
				useUserStore.getState().logout();
				router.navigate({ to: "/login" }).catch(() => {});
			}
			return Promise.reject(new Error(res.msg || "Error"));
		}
		return res.data;
	},
	(error) => {
		if (error.response?.status === 401) {
			useUserStore.getState().logout();
			router.navigate({ to: "/login" }).catch(() => {});
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
