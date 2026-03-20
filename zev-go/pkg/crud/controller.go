package crud

import (
	"strconv"

	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

type BaseController[T any] struct {
	Service *BaseService[T]
}

func NewBaseController[T any](service *BaseService[T]) *BaseController[T] {
	return &BaseController[T]{Service: service}
}

func (c *BaseController[T]) Create(ctx *gin.Context) {
	var entity T
	if err := ctx.ShouldBindJSON(&entity); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}
	if err := c.Service.Create(&entity); err != nil {
		response.FailMessage("创建失败", ctx)
		return
	}
	response.SuccessData(entity, ctx)
}

func (c *BaseController[T]) Update(ctx *gin.Context) {
	var entity T
	if err := ctx.ShouldBindJSON(&entity); err != nil {
		response.FailMessage("参数错误", ctx)
		return
	}
	if err := c.Service.Update(&entity); err != nil {
		response.FailMessage("更新失败", ctx)
		return
	}
	response.Success(ctx)
}

func (c *BaseController[T]) Delete(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, _ := strconv.Atoi(idStr)
	if err := c.Service.Delete(uint(id)); err != nil {
		response.FailMessage("删除失败", ctx)
		return
	}
	response.Success(ctx)
}

func (c *BaseController[T]) Get(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, _ := strconv.Atoi(idStr)
	entity, err := c.Service.GetByID(uint(id))
	if err != nil {
		response.FailMessage("获取失败", ctx)
		return
	}
	response.SuccessData(entity, ctx)
}

func (c *BaseController[T]) List(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("pageSize", "10"))

	list, total, err := c.Service.List(page, pageSize)
	if err != nil {
		response.FailMessage("获取列表失败", ctx)
		return
	}

	response.SuccessData(map[string]interface{}{
		"list":  list,
		"total": total,
	}, ctx)
}
