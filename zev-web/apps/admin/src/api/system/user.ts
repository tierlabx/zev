import type { UserListParams, UserListResponse } from "../dto/system/user";

import type { User } from "../interface/system/user";
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
