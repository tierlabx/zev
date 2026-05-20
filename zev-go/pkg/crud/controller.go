package crud

import (
	"strconv"

	"zev-go/pkg/response"

	"github.com/gin-gonic/gin"
)

// BaseController 是通用的控制器实现，通过泛型 T 支持任意实体的 CRUD 路由处理。
type BaseController[T any] struct {
	Service *BaseService[T]
}

// NewBaseController 用于初始化并返回一个通用的 BaseController 实例。
func NewBaseController[T any](service *BaseService[T]) *BaseController[T] {
	return &BaseController[T]{Service: service}
}

// Create 是处理“新增记录”的 HTTP 处理程序。
// 它从 HTTP 请求体中绑定 JSON 数据并解析为泛型实体 T，然后调用 Service 进行创建。
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

// Update 是处理“更新记录”的 HTTP 处理程序。
// 它从 HTTP 请求体中绑定 JSON 数据，并调用 Service 对其进行全量保存更新。
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

// Delete 是处理“删除记录”的 HTTP 处理程序。
// 它从请求的路径参数（例如 :id）中读取并解析 ID，调用 Service 进行软/硬删除。
func (c *BaseController[T]) Delete(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, _ := strconv.Atoi(idStr)
	if err := c.Service.Delete(uint(id)); err != nil {
		response.FailMessage("删除失败", ctx)
		return
	}
	response.Success(ctx)
}

// Get 是处理“获取单条详情”的 HTTP 处理程序。
// 它根据路径参数中的 ID 从数据库查询单条记录，并以 JSON 形式返回。
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

// List 是处理“获取分页列表”的 HTTP 处理程序。
// 它支持 Query 参数：page（当前页码，默认为 1），pageSize（每页数量，默认为 10）。
// 返回统一格式的分页数据结构，包含 list (当前页数据) 和 total (总记录数)。
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
