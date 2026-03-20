package crud

import (
	"gorm.io/gorm"
)

type BaseService[T any] struct {
	DB *gorm.DB
}

func NewBaseService[T any](db *gorm.DB) *BaseService[T] {
	return &BaseService[T]{DB: db}
}

func (s *BaseService[T]) Create(entity *T) error {
	return s.DB.Create(entity).Error
}

func (s *BaseService[T]) Update(entity *T) error {
	return s.DB.Save(entity).Error
}

func (s *BaseService[T]) Delete(id uint) error {
	var entity T
	return s.DB.Delete(&entity, id).Error
}

func (s *BaseService[T]) GetByID(id uint) (*T, error) {
	var entity T
	err := s.DB.First(&entity, id).Error
	return &entity, err
}

func (s *BaseService[T]) List(page, pageSize int) ([]T, int64, error) {
	var entities []T
	var total int64
	var model T

	s.DB.Model(&model).Count(&total)
	err := s.DB.Offset((page - 1) * pageSize).Limit(pageSize).Find(&entities).Error

	return entities, total, err
}
