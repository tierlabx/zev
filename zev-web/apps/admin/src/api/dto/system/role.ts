import type { DataScopeValue, Role } from "../../interface/system/role";

export interface RoleListParams {
	page: number;
	pageSize: number;
	keyword?: string;
}

export interface RoleListResponse {
	list: Role[];
	total: number;
}

export interface AssignRoleDataScopeParams {
	data_scope: DataScopeValue;
	dept_ids: number[];
}
