import request from "../request";

export interface DashboardStats {
	total_users: number;
	active_users: number;
	total_roles: number;
	system_dict_count: number;
}

export const getDashboardStats = () => {
	return request.get<DashboardStats>("/system/dashboard/stats");
};
