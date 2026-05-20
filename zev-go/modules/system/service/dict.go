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
