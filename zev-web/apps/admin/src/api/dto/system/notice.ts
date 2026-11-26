/**
 * 个人收件箱分页筛选参数
 */
export interface MyNoticeQueryParams {
	page: number;
	pageSize: number;
	type?: number;
	isRead?: boolean;
	level?: number;
	keyword?: string;
}

/**
 * 个人已发送消息分页筛选参数
 */
export interface SentNoticeQueryParams {
	page: number;
	pageSize: number;
	type?: number;
	level?: number;
	keyword?: string;
}

/**
 * 消息管理列表分页筛选参数
 */
export interface ManageNoticeQueryParams {
	page: number;
	pageSize: number;
	keyword?: string;
	type?: number;
	level?: number;
	status?: number;
	targetType?: number;
}

/**
 * 消息分页通用返回结构
 */
export interface NoticePageResult<T> {
	list: T[];
	total: number;
	page: number;
	pageSize: number;
}

/**
 * 创建通知公告请求体
 */
export interface CreateNoticePayload {
	title: string;
	content: string;
	type: number;
	level: number;
	targetType: number;
	targetIds: number[];
	link?: string;
	publishNow: boolean;
}

/**
 * 编辑通知公告请求体
 */
export interface UpdateNoticePayload {
	id: number;
	title: string;
	content: string;
	type: number;
	level: number;
	targetType: number;
	targetIds: number[];
	link?: string;
}

/**
 * 发送站内私信请求体
 */
export interface SendDirectMessagePayload {
	title: string;
	content: string;
	level: number;
	receiverIds: number[];
	link?: string;
}
