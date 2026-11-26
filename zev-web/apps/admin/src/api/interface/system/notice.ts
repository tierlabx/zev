/**
 * 个人收件箱消息实体
 */
export interface MyNoticeItem {
	id: number;
	title: string;
	content: string;
	type: number; // 1: 系统公告, 2: 业务提醒, 3: 站内私信
	level: number; // 0: 普通, 1: 重要, 2: 紧急
	targetType: number;
	link: string;
	senderId: number;
	sender: string;
	isRead: boolean;
	readAt?: string | null;
	publishedAt?: string | null;
	createdAt: string;
}

/**
 * 已发送消息接收人及阅读状态明细
 */
export interface SentNoticeRecipientItem {
	userId: number;
	username: string;
	nickname: string;
	isRead: boolean;
	readAt?: string | null;
}

/**
 * 个人已发送消息实体（含接收人预览与已读回执统计）
 */
export interface SentNoticeItem {
	id: number;
	title: string;
	content: string;
	type: number;
	level: number;
	targetType: number;
	link: string;
	status: number; // 1: 已发布, 2: 已撤回
	senderId: number;
	sender: string;
	readCount: number;
	totalCount: number;
	recipients: SentNoticeRecipientItem[];
	publishedAt?: string | null;
	createdAt: string;
}

/**
 * 各分类未读消息数量汇总
 */
export interface UnreadCountRes {
	total: number;
	system: number;
	reminder: number;
	private: number;
}

/**
 * 消息管理台实体（含目标范围与已读回执统计）
 */
export interface ManageNoticeItem {
	id: number;
	title: string;
	content: string;
	type: number;
	level: number;
	targetType: number; // 1: 全员, 2: 指定部门, 3: 指定角色, 4: 指定用户
	targetIds: number[];
	link: string;
	status: number; // 0: 草稿, 1: 已发布, 2: 已撤回
	senderId: number;
	deptId: number;
	sender: string;
	readCount: number;
	totalCount: number;
	publishedAt?: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * 接收人下拉选项（精简字段）
 */
export interface ReceiverOption {
	id: number;
	username: string;
	nickname: string;
	deptName: string;
}

/**
 * 后端 SSE 实时消息推送事件载荷
 */
export interface NoticePushEvent {
	noticeId: number;
	title: string;
	summary: string;
	type: number;
	level: number;
	sender: string;
	link: string;
	publishedAt: string;
}
