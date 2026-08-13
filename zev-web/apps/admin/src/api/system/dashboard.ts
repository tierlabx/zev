import request from "../request";

export interface DashboardTrendRes {
	date: string;
	count: number;
}

export interface DashboardActivityRes {
	id: number;
	operator: string;
	action: string;
	createdAt: string;
}

export interface DashboardStatsRes {
	userTotal: number;
	roleTotal: number;
	menuTotal: number;
	dictTotal: number;
}

export interface DashboardHealthRes {
	apiUsage: number;
	dbResponse: number;
	memoryUsage: number;
	cpuUsage: number;
}

export interface DashboardRes {
	stats: DashboardStatsRes;
	trends: DashboardTrendRes[];
	activities: DashboardActivityRes[];
	health: DashboardHealthRes;
}

export const getDashboardStats = () => {
	return request.get<DashboardRes>("/system/dashboard/stats");
};
