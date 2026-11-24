import type { DeptFormPayload, DeptQueryParams } from "../dto/system/dept";
import type { Dept, DeptTreeNode } from "../interface/system/dept";
import request from "../request";

export type { Dept, DeptTreeNode };

export const getDeptTree = (params?: DeptQueryParams) => {
	return request.get<DeptTreeNode[]>("/system/dept/tree", { params });
};

export const getDeptOptionsTree = () => {
	return request.get<DeptTreeNode[]>("/system/dept/options");
};

export const createDept = (data: DeptFormPayload) => {
	return request.post("/system/dept/create", data);
};

export const updateDept = (data: DeptFormPayload) => {
	return request.put("/system/dept/update", data);
};

export const deleteDept = (id: number) => {
	return request.delete(`/system/dept/delete/${id}`);
};
