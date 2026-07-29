package controller

import (
	"strconv"

	"zev-go/modules/system/entity"
	"zev-go/modules/system/service"
	"zev-go/pkg/crud"
	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
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

// List 重写获取字典类型列表，支持 keyword 模糊搜索
// @Summary 获取字典类型列表
// @Description 获取分页字典类型列表，支持按名称、类型进行 keyword 模糊搜索
// @Tags 系统管理-字典
// @Produce json
// @Security Bearer
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param keyword query string false "搜索关键词"
// @Success 200 {object} response.Response "成功"
// @Router /api/system/dict/type/list [get]
func (c *DictTypeController) List(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("pageSize", "10"))
	keyword := ctx.Query("keyword")

	list, total, err := c.dictTypeService.ListWithKeyword(page, pageSize, keyword)
	if err != nil {
		response.FailMessage("获取列表失败", ctx)
		return
	}

	response.SuccessData(map[string]interface{}{
		"list":  list,
		"total": total,
	}, ctx)
}
