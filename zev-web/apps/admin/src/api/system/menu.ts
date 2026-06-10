import type { Menu } from "../interface/system/menu";
import request from "../request";

export type { Menu };

export interface MenuListParams {
	page: number;
	pageSize: number;
}

export interface MenuListResponse {
	list: Menu[];
	total: number;
}

export const getMenuList = (params: MenuListParams) => {
	return request.get<MenuListResponse>("/system/menu/list", { params });
};

export const getMenuTree = () => {
	return request.get<Menu[]>("/system/menu/tree");
};

export const createMenu = (data: Partial<Menu>) => {
	return request.post("/system/menu/create", data);
};

export const updateMenu = (data: Partial<Menu>) => {
	return request.put("/system/menu/update", data);
};

export const deleteMenu = (id: number) => {
	return request.delete(`/system/menu/delete/${id}`);
};
