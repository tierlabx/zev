import { useMutation } from "@tanstack/react-query";
import request from "../request";

export interface LoginParams {
	username?: string;
	password?: string;
}

export interface LoginResponse {
	token: string;
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
	return request.post("/system/logout");
};

export const useLogoutMutation = () => {
	return useMutation({
		mutationFn: logoutApi,
	});
};
