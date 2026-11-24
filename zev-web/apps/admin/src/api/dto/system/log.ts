/**
 * 操作日志分页筛选请求参数
 */
export interface OperLogQueryParams {
	page: number;
	pageSize: number;
	operator?: string;
	module?: string;
	action?: string;
	method?: string;
	status?: number;
	requestId?: string;
	startTime?: string;
	endTime?: string;
}

/**
 * 登录日志分页筛选请求参数
 */
export interface LoginLogQueryParams {
	page: number;
	pageSize: number;
	username?: string;
	ip?: string;
	status?: number;
	requestId?: string;
	startTime?: string;
	endTime?: string;
}

/**
 * 日志分页统一返回结构
 */
export interface LogPageResult<T> {
	list: T[];
	total: number;
	page: number;
	pageSize: number;
}

/**
 * 日志审计今日概览统计数据
 */
export interface LogStats {
	operTotal: number;
	operToday: number;
	operErrorToday: number;
	loginToday: number;
	loginFailToday: number;
}

/**
 * 批量删除日志请求体
 */
export interface BatchDeleteLogParams {
	ids: number[];
}
