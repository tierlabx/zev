package entity

// AllModels 返回系统模块的所有实体模型，用于集中进行数据库迁移和 Swagger 注册。
// 注意：数组的顺序即为建表和外键依赖的迁移顺序，请谨慎调整。
func AllModels() []any {
	return []any{
		&User{},
		&Role{},
		&Menu{},
		&DictType{},
		&DictData{},
		&SysNotice{},
		&SysOperLog{},
	}
}
