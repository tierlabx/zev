import type { ChangePasswordParams, UpdateProfileParams, UserListParams, UserListResponse } from "../dto/system/user";

import type { User, UserInfo } from "../interface/system/user";
import request from "../request";

export type { User };

export const getUserList = (params: UserListParams) => {
	return request.get<UserListResponse>("/system/user/list", { params });
};

export const createUser = (data: Partial<User>) => {
	return request.post("/system/user/create", data);
};

export const updateUser = (data: Partial<User>) => {
	return request.put("/system/user/update", data);
};

export const deleteUser = (id: number) => {
	return request.delete(`/system/user/delete/${id}`);
};

export const assignUserRole = (id: number, roleId: number) => {
	return request.post(`/system/user/role/${id}`, { role_id: roleId });
};

export const updateProfile = (data: UpdateProfileParams) => {
	return request.put<UserInfo>("/system/user/profile", data);
};

export const changePassword = (data: ChangePasswordParams) => {
	return request.put("/system/user/password", data);
};
