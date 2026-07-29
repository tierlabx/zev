package service

import (
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"

	"gorm.io/gorm"
)

type DictTypeService struct {
	*crud.BaseService[entity.DictType]
}

func NewDictTypeService(db *gorm.DB) *DictTypeService {
	return &DictTypeService{
		BaseService: crud.NewBaseService[entity.DictType](db),
	}
}

type DictDataService struct {
	*crud.BaseService[entity.DictData]
}

func NewDictDataService(db *gorm.DB) *DictDataService {
	return &DictDataService{
		BaseService: crud.NewBaseService[entity.DictData](db),
	}
}

func (s *DictTypeService) ListWithKeyword(page, pageSize int, keyword string) ([]entity.DictType, int64, error) {
	var entities []entity.DictType
	var total int64
	var model entity.DictType

	db := s.DB.Model(&model)
	if keyword != "" {
		db = db.Where("name LIKE ? OR type LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	db.Count(&total)
	err := db.Offset((page - 1) * pageSize).Limit(pageSize).Find(&entities).Error

	return entities, total, err
}
