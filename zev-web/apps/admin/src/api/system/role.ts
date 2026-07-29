import request from "../request";

export interface Role {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	name: string;
	code: string;
	status: number;
	sort: number;
	desc: string;
}

export interface RoleListParams {
	page: number;
	pageSize: number;
	keyword?: string;
}

export interface RoleListResponse {
	list: Role[];
	total: number;
}

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
