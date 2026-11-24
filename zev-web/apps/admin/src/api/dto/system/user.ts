import type { User } from "../../interface/system/user";

export interface UserListParams {
	page: number;
	pageSize: number;
	keyword?: string;
}

export interface UserListResponse {
	list: User[];
	total: number;
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
