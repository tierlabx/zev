package controller

import (
	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
)

type DictTypeController struct {
	*crud.BaseController[entity.DictType]
	dictTypeService *service.DictTypeService
}

func NewDictTypeController(dictTypeService *service.DictTypeService) *DictTypeController {
	return &DictTypeController{
		BaseController:  crud.NewBaseController[entity.DictType](dictTypeService.BaseService),
		dictTypeService: dictTypeService,
	}
}

type DictDataController struct {
	*crud.BaseController[entity.DictData]
	dictDataService *service.DictDataService
}

func NewDictDataController(dictDataService *service.DictDataService) *DictDataController {
	return &DictDataController{
		BaseController:  crud.NewBaseController[entity.DictData](dictDataService.BaseService),
		dictDataService: dictDataService,
	}
}
