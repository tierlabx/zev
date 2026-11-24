import type { AssignRoleDataScopeParams, RoleListParams, RoleListResponse } from "../dto/system/role";
import type { DataScopeValue, Role, RoleDataScope } from "../interface/system/role";
import request from "../request";

export type { AssignRoleDataScopeParams, DataScopeValue, Role, RoleDataScope, RoleListParams, RoleListResponse };

export const getRoleList = (params: RoleListParams) => {
	return request.get<RoleListResponse>("/system/role/list", { params });
};

export const createRole = (data: Partial<Role>) => {
	return request.post("/system/role/create", data);
};

export const updateRole = (data: Partial<Role>) => {
	return request.put("/system/role/update", data);
};

export const deleteRole = (id: number) => {
	return request.delete(`/system/role/delete/${id}`);
};

export const getRoleMenus = (id: number) => {
	return request.get<number[]>(`/system/role/menus/${id}`);
};

export const assignRoleMenus = (id: number, menuIDs: number[]) => {
	return request.post(`/system/role/menus/${id}`, { menu_ids: menuIDs });
};

export const getRoleDataScope = (id: number) => {
	return request.get<RoleDataScope>(`/system/role/datascope/${id}`);
};

export const assignRoleDataScope = (id: number, data: AssignRoleDataScopeParams) => {
	return request.put(`/system/role/datascope/${id}`, data);
};
