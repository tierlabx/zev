/*
Package crud 提供了基于 Go 泛型和 GORM / Gin 框架的通用 CRUD（增删改查）基础实现。

该包的主要目的是减少重复的模板代码，为常见的数据库实体快速生成标准化的服务层和控制器层 API。

主要组件:

1. BaseService[T any]:
基于 GORM 的泛型服务层。它封装了最基础的数据库单表操作，包括：
  - Create: 插入一条新记录
  - Update: 保存/更新现有记录
  - Delete: 根据主键 ID 软删除或硬删除记录
  - GetByID: 根据主键 ID 查询单条记录
  - List: 分页查询列表并返回总计数

2. BaseController[T any]:
基于 Gin 框架的泛型控制器层。它将 HTTP 请求与 BaseService 进行对接，提供了标准 RESTful API 的 Handler 实现：
  - Create (POST /create): 绑定请求 JSON，并调用 Service 写入数据库
  - Update (PUT /update): 绑定请求 JSON，并调用 Service 更新数据库
  - Delete (DELETE /delete/:id): 从 URL 路径中提取 ID，并调用 Service 删除记录
  - Get (GET /get/:id): 从 URL 路径中提取 ID，调用 Service 查询详情并返回
  - List (GET /list): 自动从 Query 参数中解析 page 和 pageSize，执行分页查询并返回统一格式的列表和总数

使用示例:

假设我们有一个实体 User：

	type User struct {
		ID       uint   `gorm:"primaryKey"`
		Username string `json:"username"`
		Email    string `json:"email"`
	}

我们只需在路由初始化时这样注册：

	// 1. 初始化 Service
	userService := crud.NewBaseService[entity.User](db)

	// 2. 初始化 Controller
	userController := crud.NewBaseController[entity.User](userService)

	// 3. 注册 Gin 路由
	router.POST("/api/user/create", userController.Create)
	router.PUT("/api/user/update", userController.Update)
	router.DELETE("/api/user/delete/:id", userController.Delete)
	router.GET("/api/user/get/:id", userController.Get)
	router.GET("/api/user/list", userController.List)

通过以上三步即可快速建立起针对 User 实体的标准 CRUD API，无需手动编写重复的 SQL 或 Controller 代码。
*/
package crud
