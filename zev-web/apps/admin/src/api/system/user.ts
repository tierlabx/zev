import type {
	ChangePasswordParams,
	UpdateProfileParams,
	UserFormPayload,
	UserListParams,
	UserListResponse,
} from "../dto/system/user";
import type { User, UserInfo } from "../interface/system/user";
import request from "../request";

export type { User, UserFormPayload };

export const getUserList = (params: UserListParams) => {
	return request.get<UserListResponse>("/system/user/list", { params });
};

export const createUser = (data: UserFormPayload) => {
	return request.post("/system/user/create", data);
};

export const updateUser = (data: UserFormPayload) => {
	return request.put("/system/user/update", data);
};

export const deleteUser = (id: number) => {
	return request.delete(`/system/user/delete/${id}`);
};

export const assignUserRoles = (id: number, roleIds: number[]) => {
	return request.post(`/system/user/role/${id}`, {
		role_id: roleIds[0] ?? 0,
		role_ids: roleIds,
	});
};

export const assignUserRole = (id: number, roleId: number) => {
	return assignUserRoles(id, [roleId]);
};

export const updateProfile = (data: UpdateProfileParams) => {
	return request.put<UserInfo>("/system/user/profile", data);
};

export const changePassword = (data: ChangePasswordParams) => {
	return request.put("/system/user/password", data);
};
