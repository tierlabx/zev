package dto

import "time"

const (
	NoticeTypeSystem   = 1 // 系统公告
	NoticeTypeReminder = 2 // 业务提醒
	NoticeTypePrivate  = 3 // 站内私信

	NoticeLevelNormal    = 0 // 普通
	NoticeLevelImportant = 1 // 重要
	NoticeLevelUrgent    = 2 // 紧急

	NoticeTargetAll  = 1 // 全员广播
	NoticeTargetDept = 2 // 指定部门
	NoticeTargetRole = 3 // 指定角色
	NoticeTargetUser = 4 // 指定用户

	NoticeStatusDraft     = 0 // 草稿
	NoticeStatusPublished = 1 // 已发布
	NoticeStatusRevoked   = 2 // 已撤回
)

// MyNoticeListReq 个人消息收件箱分页筛选参数
type MyNoticeListReq struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Type     int    `form:"type"`
	IsRead   *bool  `form:"isRead"`
	Level    *int   `form:"level"`
	Keyword  string `form:"keyword"`
}

// ReadAllNoticeReq 全部标为已读请求（可选按消息类型过滤）
type ReadAllNoticeReq struct {
	Type int `json:"type"`
}

// ManageNoticeListReq 消息管理列表分页筛选参数
type ManageNoticeListReq struct {
	Page       int    `form:"page"`
	PageSize   int    `form:"pageSize"`
	Keyword    string `form:"keyword"`
	Type       int    `form:"type"`
	Level      *int   `form:"level"`
	Status     *int   `form:"status"`
	TargetType int    `form:"targetType"`
}

// CreateNoticeReq 创建消息请求（支持保存草稿或立即发布）
type CreateNoticeReq struct {
	Title      string `json:"title" binding:"required,max=120"`
	Content    string `json:"content" binding:"required"`
	Type       int    `json:"type" binding:"required,oneof=1 2 3"`
	Level      int    `json:"level" binding:"oneof=0 1 2"`
	TargetType int    `json:"targetType" binding:"required,oneof=1 2 3 4"`
	TargetIDs  []uint `json:"targetIds"`
	Link       string `json:"link" binding:"omitempty,max=255"`
	PublishNow bool   `json:"publishNow"`
}

// UpdateNoticeReq 编辑消息请求
type UpdateNoticeReq struct {
	ID         uint   `json:"id" binding:"required"`
	Title      string `json:"title" binding:"required,max=120"`
	Content    string `json:"content" binding:"required"`
	Type       int    `json:"type" binding:"required,oneof=1 2 3"`
	Level      int    `json:"level" binding:"oneof=0 1 2"`
	TargetType int    `json:"targetType" binding:"required,oneof=1 2 3 4"`
	TargetIDs  []uint `json:"targetIds"`
	Link       string `json:"link" binding:"omitempty,max=255"`
}

// SendDirectMessageReq 发送站内私信请求
type SendDirectMessageReq struct {
	Title       string `json:"title" binding:"required,max=120"`
	Content     string `json:"content" binding:"required"`
	Level       int    `json:"level" binding:"oneof=0 1 2"`
	ReceiverIDs []uint `json:"receiverIds" binding:"required,min=1"`
	Link        string `json:"link" binding:"omitempty,max=255"`
}

// BatchNoticeIDsReq 批量消息 ID 请求
type BatchNoticeIDsReq struct {
	IDs []uint `json:"ids" binding:"required,min=1"`
}

// MyNoticeItem 个人消息收件箱展示项
type MyNoticeItem struct {
	ID          uint       `json:"id"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	Type        int        `json:"type"`
	Level       int        `json:"level"`
	TargetType  int        `json:"targetType"`
	Link        string     `json:"link"`
	SenderID    uint       `json:"senderId"`
	Sender      string     `json:"sender"`
	IsRead      bool       `json:"isRead"`
	ReadAt      *time.Time `json:"readAt"`
	PublishedAt *time.Time `json:"publishedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// UnreadCountRes 各分类未读消息数量汇总
type UnreadCountRes struct {
	Total    int64 `json:"total"`
	System   int64 `json:"system"`
	Reminder int64 `json:"reminder"`
	Private  int64 `json:"private"`
}

// ManageNoticeItem 消息管理台列表与详情项（含已读回执统计）
type ManageNoticeItem struct {
	ID          uint       `json:"id"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	Type        int        `json:"type"`
	Level       int        `json:"level"`
	TargetType  int        `json:"targetType"`
	TargetIDs   []uint     `json:"targetIds"`
	Link        string     `json:"link"`
	Status      int        `json:"status"`
	SenderID    uint       `json:"senderId"`
	DeptID      uint       `json:"deptId"`
	Sender      string     `json:"sender"`
	ReadCount   int64      `json:"readCount"`
	TotalCount  int64      `json:"totalCount"`
	PublishedAt *time.Time `json:"publishedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// ReceiverOption 站内私信/定向发送接收人选项（仅返回最小展示字段，避免泄露用户敏感信息）
type ReceiverOption struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	DeptName string `json:"deptName"`
}

// NoticePageRes 消息分页统一响应
type NoticePageRes[T any] struct {
	List     []T   `json:"list"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}
