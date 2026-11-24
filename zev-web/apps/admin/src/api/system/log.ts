import type {
	BatchDeleteLogParams,
	LoginLogQueryParams,
	LogPageResult,
	LogStats,
	OperLogQueryParams,
} from "../dto/system/log";
import type { SysLoginLog, SysOperLog } from "../interface/system/log";
import request from "../request";

export type {
	BatchDeleteLogParams,
	LoginLogQueryParams,
	LogPageResult,
	LogStats,
	OperLogQueryParams,
	SysLoginLog,
	SysOperLog,
};

/**
 * 获取今日日志审计统计概览
 */
export function getLogStats() {
	return request.get<LogStats>("/system/log/stats");
}

/**
 * 分页查询操作日志
 */
export function getOperLogList(params: OperLogQueryParams) {
	return request.get<LogPageResult<SysOperLog>>("/system/log/oper/list", { params });
}

/**
 * 获取单条操作日志详情
 */
export function getOperLogDetail(id: number) {
	return request.get<SysOperLog>(`/system/log/oper/get/${id}`);
}

/**
 * 批量删除操作日志
 */
export function deleteOperLogs(data: BatchDeleteLogParams) {
	return request.delete<void>("/system/log/oper/delete", { data });
}

/**
 * 清空全部操作日志
 */
export function clearOperLogs() {
	return request.post<void>("/system/log/oper/clear");
}

/**
 * 导出操作日志 CSV 文件流
 */
export function exportOperLogs(params: Omit<OperLogQueryParams, "page" | "pageSize">) {
	return request.get<Blob>("/system/log/oper/export", {
		params,
		responseType: "blob",
	});
}

/**
 * 分页查询登录日志
 */
export function getLoginLogList(params: LoginLogQueryParams) {
	return request.get<LogPageResult<SysLoginLog>>("/system/log/login/list", { params });
}

/**
 * 批量删除登录日志
 */
export function deleteLoginLogs(data: BatchDeleteLogParams) {
	return request.delete<void>("/system/log/login/delete", { data });
}

/**
 * 清空全部登录日志
 */
export function clearLoginLogs() {
	return request.post<void>("/system/log/login/clear");
}

/**
 * 导出登录日志 CSV 文件流
 */
export function exportLoginLogs(params: Omit<LoginLogQueryParams, "page" | "pageSize">) {
	return request.get<Blob>("/system/log/login/export", {
		params,
		responseType: "blob",
	});
}
