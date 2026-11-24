import axios, { type AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { t } from "@/i18n";
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
				toast.error(t("request.forbidden"));
			} else {
				toast.error(res.msg || t("request.errorFallback"));
			}
			return Promise.reject(new Error(res.msg || t("request.errorFallback")));
		}
		return res.data;
	},
	(error) => {
		const status = error.response?.status;

		if (status === 401) {
			useUserStore.getState().logout();
			window.location.href = "/login";
		} else if (status === 403) {
			toast.error(t("request.forbidden"));
		} else if (status === 400) {
			toast.error(error.response?.data?.msg || t("request.badRequest"));
		} else if (status === 404) {
			toast.error(t("request.notFound"));
		} else if (status === 500) {
			toast.error(t("request.serverError"));
		} else if (error.code === "ECONNABORTED") {
			toast.error(t("request.timeout"));
		} else if (error.message === "Network Error" || !error.response) {
			toast.error(t("request.networkError"));
		} else {
			toast.error(error.message || t("request.requestFailed"));
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
