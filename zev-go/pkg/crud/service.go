package crud

import (
	"gorm.io/gorm"
)

// BaseService 是基于 GORM 的泛型基础服务，实现常见实体 T 的通用数据库操作。
type BaseService[T any] struct {
	DB *gorm.DB
}

// NewBaseService 用于初始化并返回一个通用的 BaseService 实例。
func NewBaseService[T any](db *gorm.DB) *BaseService[T] {
	return &BaseService[T]{DB: db}
}

// Create 往数据库插入一条新的泛型实体记录。
func (s *BaseService[T]) Create(entity *T) error {
	return s.DB.Create(entity).Error
}

// Update 用于更新已有的实体记录，使用 GORM 的 Save 执行全量保存。
func (s *BaseService[T]) Update(entity *T) error {
	return s.DB.Save(entity).Error
}

// Delete 根据主键 ID 删除对应的记录。
// 注意：如果泛型实体 T 中包含 gorm.DeletedAt 字段，GORM 会默认执行软删除（Soft Delete）。
func (s *BaseService[T]) Delete(id uint) error {
	var entity T
	return s.DB.Delete(&entity, id).Error
}

// GetByID 根据主键 ID 在数据库中检索单条记录。
func (s *BaseService[T]) GetByID(id uint) (*T, error) {
	var entity T
	err := s.DB.First(&entity, id).Error
	return &entity, err
}

// List 提供了通用的分页查询实现。
// 接收 page（当前页码，1-based）和 pageSize（每页记录条数），
// 返回当前页的数据切片、总记录数 total 以及可能的错误。
func (s *BaseService[T]) List(page, pageSize int) ([]T, int64, error) {
	var entities []T
	var total int64
	var model T

	s.DB.Model(&model).Count(&total)
	err := s.DB.Offset((page - 1) * pageSize).Limit(pageSize).Find(&entities).Error

	return entities, total, err
}
