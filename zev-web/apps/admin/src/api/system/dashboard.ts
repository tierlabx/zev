import request from "../request";

export interface DashboardTrendRes {
	date: string;
	count: number;
	logins: number;
	operations: number;
	failures: number;
}

export interface DashboardHeartbeatRes {
	hour: string;
	total: number;
	failed: number;
}

export interface DashboardModuleRes {
	module: string;
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
	dbLatency: number;
	memoryUsage: number;
	cpuUsage: number;
}

export interface DashboardRes {
	stats: DashboardStatsRes;
	trends: DashboardTrendRes[];
	heartbeats: DashboardHeartbeatRes[];
	modules: DashboardModuleRes[];
	activities: DashboardActivityRes[];
	health: DashboardHealthRes;
}

export const getDashboardStats = () => {
	return request.get<DashboardRes>("/system/dashboard/stats");
};
