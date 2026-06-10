import type { User } from "../../interface/system/user";

export interface UserListParams {
	page: number;
	pageSize: number;
}

export interface UserListResponse {
	list: User[];
	total: number;
}
