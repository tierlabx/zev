import { useMutation, useQuery } from "@tanstack/react-query";
import type { UserInfo } from "../interface/system/user";
import request from "../request";

export interface LoginParams {
	username: string;
	password: string;
	captcha_id: string;
	captcha_code: string;
}

export interface CaptchaResponse {
	captcha_id: string;
	captcha_img: string;
	expire_after: number;
}

export interface LoginResponse {
	token: string;
	nickname: string;
	avatar: string;
	role_id: number;
	role_name: string;
}

export const CAPTCHA_QUERY_KEY = ["auth", "captcha"] as const;

export const getCaptchaApi = async (): Promise<CaptchaResponse> => {
	return request.get("/system/captcha");
};

export const useCaptchaQuery = () => {
	return useQuery({
		queryKey: CAPTCHA_QUERY_KEY,
		queryFn: getCaptchaApi,
		// 验证码为一次性凭据，禁止缓存与切窗自动刷新，避免已输入的验证码被意外覆盖
		staleTime: 0,
		gcTime: 0,
		refetchOnWindowFocus: false,
		retry: 1,
	});
};

export const loginApi = async (data: LoginParams): Promise<LoginResponse> => {
	return request.post("/system/login", data);
};

export const useLoginMutation = () => {
	return useMutation({
		mutationFn: loginApi,
	});
};

export const logoutApi = async (): Promise<void> => {
	return request.post("/system/user/logout");
};

export const useLogoutMutation = () => {
	return useMutation({
		mutationFn: logoutApi,
	});
};

export const getUserInfoApi = async (): Promise<UserInfo> => {
	return request.get("/system/user/info");
};
