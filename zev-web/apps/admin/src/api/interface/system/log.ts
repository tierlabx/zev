/**
 * 操作审计日志实体
 */
export interface SysOperLog {
	id: number;
	requestId: string;
	user_id: number;
	dept_id: number;
	operator: string;
	action: string;
	module: string;
	method: string;
	url: string;
	queryParams: string;
	requestBody: string;
	responseBody: string;
	ip: string;
	userAgent: string;
	browser: string;
	os: string;
	status: number;
	errorMsg: string;
	latency: number;
	createdAt: string;
}

/**
 * 登录审计日志实体
 */
export interface SysLoginLog {
	id: number;
	user_id: number;
	dept_id: number;
	username: string;
	status: number;
	message: string;
	ip: string;
	userAgent: string;
	browser: string;
	os: string;
	requestId: string;
	loginTime: string;
}
