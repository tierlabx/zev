import type {
	CreateNoticePayload,
	ManageNoticeQueryParams,
	MyNoticeQueryParams,
	NoticePageResult,
	SendDirectMessagePayload,
	SentNoticeQueryParams,
	UpdateNoticePayload,
} from "../dto/system/notice";
import type {
	ManageNoticeItem,
	MyNoticeItem,
	NoticePushEvent,
	ReceiverOption,
	SentNoticeItem,
	SentNoticeRecipientItem,
	UnreadCountRes,
} from "../interface/system/notice";
import request from "../request";

export type {
	CreateNoticePayload,
	ManageNoticeItem,
	ManageNoticeQueryParams,
	MyNoticeItem,
	MyNoticeQueryParams,
	NoticePageResult,
	NoticePushEvent,
	ReceiverOption,
	SendDirectMessagePayload,
	SentNoticeItem,
	SentNoticeQueryParams,
	SentNoticeRecipientItem,
	UnreadCountRes,
	UpdateNoticePayload,
};

/**
 * 获取当前登录用户未读消息计数
 */
export function getUnreadCount() {
	return request.get<UnreadCountRes>("/system/notice/unread-count");
}

/**
 * 获取最近未读通知列表（顶栏铃铛使用）
 */
export function getNoticeList(limit = 6) {
	return request.get<MyNoticeItem[]>("/system/notice/list", { params: { limit } });
}

/**
 * 分页查询个人收件箱消息
 */
export function getMyNoticeList(params: MyNoticeQueryParams) {
	return request.get<NoticePageResult<MyNoticeItem>>("/system/notice/my", { params });
}

/**
 * 获取个人单条消息详情
 */
export function getMyNoticeDetail(id: number) {
	return request.get<MyNoticeItem>(`/system/notice/my/${id}`);
}

/**
 * 标记单条消息已读
 */
export function markNoticeAsRead(id: number) {
	return request.put<void>(`/system/notice/read/${id}`);
}

/**
 * 标记单条消息未读
 */
export function markNoticeAsUnread(id: number) {
	return request.put<void>(`/system/notice/unread/${id}`);
}

/**
 * 全部消息标为已读（可选按类型）
 */
export function markAllNoticesAsRead(type?: number) {
	return request.put<void>("/system/notice/read-all", type ? { type } : {});
}

/**
 * 批量删除个人收件箱消息
 */
export function deleteMyNotices(ids: number[]) {
	return request.delete<void>("/system/notice/my/delete", { data: { ids } });
}

/**
 * 清空个人全部已读消息
 */
export function clearReadNotices() {
	return request.delete<void>("/system/notice/my/clear-read");
}

/**
 * 获取站内接收人候选项列表
 */
export function getReceiverOptions(keyword?: string) {
	return request.get<ReceiverOption[]>("/system/notice/receivers", {
		params: keyword ? { keyword } : undefined,
	});
}

/**
 * 发送站内私信
 */
export function sendDirectMessage(data: SendDirectMessagePayload) {
	return request.post<{ id: number }>("/system/notice/direct", data);
}

/**
 * 分页查询当前用户已发送消息记录
 */
export function getSentNoticeList(params: SentNoticeQueryParams) {
	return request.get<NoticePageResult<SentNoticeItem>>("/system/notice/sent", { params });
}

/**
 * 获取已发送单条消息详情与完整接收人阅读状态
 */
export function getSentNoticeDetail(id: number) {
	return request.get<SentNoticeItem>(`/system/notice/sent/${id}`);
}

/**
 * 发件人撤回自己发出的站内私信
 */
export function revokeSentDirectMessage(id: number) {
	return request.post<void>(`/system/notice/sent/revoke/${id}`);
}

/**
 * 管理端分页查询消息列表
 */
export function getManageNoticeList(params: ManageNoticeQueryParams) {
	return request.get<NoticePageResult<ManageNoticeItem>>("/system/notice/manage/list", { params });
}

/**
 * 管理端获取单条消息详情
 */
export function getManageNoticeDetail(id: number) {
	return request.get<ManageNoticeItem>(`/system/notice/manage/get/${id}`);
}

/**
 * 管理端新建消息（草稿或立即发布）
 */
export function createNotice(data: CreateNoticePayload) {
	return request.post<ManageNoticeItem>("/system/notice/create", data);
}

/**
 * 管理端更新消息内容
 */
export function updateNotice(data: UpdateNoticePayload) {
	return request.put<void>("/system/notice/update", data);
}

/**
 * 发布消息
 */
export function publishNotice(id: number) {
	return request.post<void>(`/system/notice/publish/${id}`);
}

/**
 * 撤回消息
 */
export function revokeNotice(id: number) {
	return request.post<void>(`/system/notice/revoke/${id}`);
}

/**
 * 管理端批量删除消息
 */
export function deleteManageNotices(ids: number[]) {
	return request.delete<void>("/system/notice/delete", { data: { ids } });
}
