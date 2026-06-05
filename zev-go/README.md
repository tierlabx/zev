# Zev Go Backend

Zev 项目的 Go 语言后端服务。基于 Gin 框架和 GORM 开发的现代化 Web 后端。

## 技术栈

- **Web 框架**: [Gin](https://github.com/gin-gonic/gin)
- **ORM**: [GORM](https://gorm.io/)
- **数据库**: PostgreSQL
- **API 文档**: [Swaggo](https://github.com/swaggo/swag)
- **热重载**: [Air](https://github.com/cosmtrek/air)

## 快速开始

### 1. 环境准备

确保您已安装：
- Go (推荐 1.21 或以上版本)
- PostgreSQL

### 2. 数据库配置

项目提供了一个 `docker-compose-db.yml` 用于快速启动本地 PostgreSQL 数据库：

```bash
docker-compose -f docker-compose-db.yml up -d
```

启动后，在根目录配置 `.env` 文件，确保填入正确的数据库连接信息：
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=zev
APP_PORT=8080
TRUSTED_PROXIES=127.0.0.1

```

### 3. 安装依赖与启动服务

建议使用 `air` 进行本地开发，支持热重载（保存代码即自动重新编译运行）：

```bash
# 安装 air (如果尚未安装)
go install github.com/air-verse/air@latest

# 安装依赖
go mod tidy

# 启动服务 (带热重载)
air
```

如果不使用 `air`，也可以直接使用 `go run`：
```bash
go run main.go
```

## 目录结构

```text
zev-go/
├── config/             # 配置管理 (环境变量加载)
├── docs/               # 自动生成的 Swagger 接口文档
├── modules/            # 业务模块 (采用模块化划分设计)
│   └── system/         # 系统基础模块 (如 controller, service, entity)
├── pkg/                # 公共基础包/工具类
│   ├── response/       # 统一响应处理
│   ├── middleware/     # Gin 中间件
│   ├── jwtx/           # JWT 封装
│   ├── crud/           # CRUD 泛型工具
│   └── swagger/        # Swagger 自动化相关配置
├── main.go             # 项目启动入口
└── .air.toml           # Air 热重载配置文件
```

## 接口文档 (Swagger)

本项目使用 `swaggo/swag` 和 `swaggo/gin-swagger` 自动生成接口文档。

### 访问方式

服务启动后，在浏览器访问以下地址即可查看 API 接口文档：

[http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

### 如何重新生成接口文档

**自动更新机制已启用！**
每当服务启动时（例如使用 Air 热重载时），后台都会自动调用 `swag init` 去扫描并生成最新的接口文档。因此通常情况下，你**只需要在代码中加上注释，然后保存并让服务重启即可生效**。

*(注：如果在开发中遇到 `air` 一直无限重启，请确保 `.air.toml` 中的 `exclude_dir` 包含了 `docs`，并且 `exclude_file` 包含自动生成的 go 文件)*

如果需要手动强制生成，在 `zev-go` 目录下运行以下命令即可：

```bash
go run github.com/swaggo/swag/cmd/swag@latest init --parseDependency --parseInternal
```

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
