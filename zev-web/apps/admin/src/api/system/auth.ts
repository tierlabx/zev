import { useMutation } from "@tanstack/react-query";
import type { UserInfo } from "../interface/system/user";
import request from "../request";

export interface LoginParams {
	username?: string;
	password?: string;
}

export interface LoginResponse {
	token: string;
	nickname: string;
	avatar: string;
	role_id: number;
	role_name: string;
}

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
