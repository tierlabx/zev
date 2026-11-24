export interface User {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	username: string;
	nickname: string;
	email: string;
	avatar: string;
	dept_id: number;
	dept_name?: string;
	role_id: number;
	role_ids?: number[];
	created_by?: number;
	status: number;
}

export interface MenuItem {
	ID: number;
	parent_id: number;
	name: string;
	path: string;
	component: string;
	icon: string;
	sort: number;
	type: string;
	perms: string;
	children?: MenuItem[];
}

export interface UserInfo {
	id: number;
	username: string;
	nickname: string;
	avatar: string;
	email: string;
	dept_id: number;
	dept_name: string;
	role_id: number;
	role_ids: number[];
	roles: string[];
	role_name: string;
	role_code: string;
	data_scope: number;
	permissions: string[];
	menus: MenuItem[];
}
