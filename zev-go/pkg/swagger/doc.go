/*
Package swagger 提供了为泛型 CRUD 控制器自动生成 Swagger API 文档的解决方案。

由于 Go 的泛型控制器（如 `crud.BaseController[T]`）在编译和静态分析时使用同一套方法签名，
传统的 `swag init` 工具在扫描代码注释时，无法直接将 `T` 转换为具体的模型类型（例如 `User` 或 `Role`），
也无法为不同的实体分别生成独立的接口路由（例如 `/api/user/create` 与 `/api/role/create` 在静态代码中对应的是同一个泛型方法）。

为了解决这个限制，本包采用了一种“动态伪造代码 + 异步生成”的策略：

1. 路由注册:
在启动或初始化路由时，调用 `RegisterCRUD` 注册需要生成 CRUD 接口的实体：
  ```
  swagger.RegisterCRUD("系统管理-用户", "/api/system/user", entity.User{})
  ```

2. 自动生成 Dummy 函数 (generateCrudSwagger):
在运行 `AutoUpdate` 时，包会遍历注册的实体列表，通过反射获取每个实体的包路径和类型名称。
接着，在 `pkg/swagger/docs_crud_generated.go` 文件中自动生成对应的虚拟 Dummy 函数（如 `DummyCreate0`, `DummyUpdate0` 等）。
每个 Dummy 函数均附带了标准的 swaggo 注释，并指定了具体的请求体（如 `@Param req body entity.User true`）和对应的真实 API 路由（如 `@Router /api/system/user/create [post]`）。

3. 异步构建文档 (AutoUpdate):
自动生成 Dummy 代码后，包会在独立的 Goroutine 中异步运行 `go run github.com/swaggo/swag/cmd/swag@latest init` 命令。
`swag` 工具扫描当前项目的代码时，会读取到这些由我们自动生成的 Dummy 函数中的 swagger 注释，从而在最终的 `docs/swagger.json` 中为泛型 CRUD 接口生成各实体专有的、信息完整的接口文档。

这种方式完美规避了 `swaggo` 目前对泛型支持较弱的问题，极大地提升了泛型 CRUD 框架在实际工程中的实用性。
*/
package swagger
