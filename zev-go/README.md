# Zev Go Backend

Zev 项目的 Go 语言后端服务。

## 接口文档 (Swagger)

本项目使用 `swaggo/swag` 和 `swaggo/gin-swagger` 自动生成接口文档。

### 访问方式

服务启动后，在浏览器访问以下地址即可查看 API 接口文档：

[http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

### 如何编写接口注释

请在控制器方法（或包级别的 Handler 函数）上方添加 Swagger 注释。详细的注释语法请参考 [Swaggo 官方文档](https://github.com/swaggo/swag/blob/master/README_zh-CN.md#%E5%A3%B0%E6%98%8E%E5%BC%8F%E6%B3%A8%E9%87%8A%E6%A0%BC%E5%BC%8F)。

**示例代码：**

```go
// Login 用户登录
// @Summary 用户登录
// @Description 使用账号密码登录
// @Tags 系统管理-用户
// @Accept json
// @Produce json
// @Param req body dto.LoginReq true "登录信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/system/login [post]
func (c *UserController) Login(ctx *gin.Context) {
    // ...
}
```

### 如何重新生成接口文档

当你添加了新的接口或修改了接口的注释后，请在 `zev-go` 目录下运行以下命令来更新 `docs` 目录：

```bash
go run github.com/swaggo/swag/cmd/swag@latest init --parseDependency --parseInternal
```

重新生成后，重启后端服务即可在页面上看到更新。
