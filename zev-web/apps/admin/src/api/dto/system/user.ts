import type { User } from "../../interface/system/user";

export interface UserListParams {
	page: number;
	pageSize: number;
	keyword?: string;
	deptId?: number;
	status?: number;
}

export interface UserListResponse {
	list: User[];
	total: number;
}

export interface UserFormPayload {
	ID?: number;
	username: string;
	password?: string;
	nickname: string;
	email: string;
	dept_id: number;
	role_id?: number;
	role_ids: number[];
	status: number;
}

export interface UpdateProfileParams {
	nickname: string;
	email: string;
	avatar: string;
}

export interface ChangePasswordParams {
	old_password: string;
	new_password: string;
}
