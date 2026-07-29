package entity

import (
	"time"
)

type SysOperLog struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Operator  string    `gorm:"type:varchar(50);not null;comment:'操作人'" json:"operator"`
	Action    string    `gorm:"type:varchar(50);not null;comment:'操作类型(新增/修改/删除)'" json:"action"`
	Module    string    `gorm:"type:varchar(50);comment:'操作模块'" json:"module"`
	Method    string    `gorm:"type:varchar(20);comment:'HTTP请求方法'" json:"method"`
	URL       string    `gorm:"type:varchar(255);comment:'请求URL'" json:"url"`
	IP        string    `gorm:"type:varchar(50);comment:'请求IP'" json:"ip"`
	Status    int       `gorm:"type:int;comment:'操作状态(0异常 1正常)'" json:"status"`
	ErrorMsg  string    `gorm:"type:text;comment:'错误信息'" json:"errorMsg"`
	Latency   int64     `gorm:"type:bigint;comment:'耗时(ms)'" json:"latency"`
	CreatedAt time.Time `json:"createdAt"`
}
