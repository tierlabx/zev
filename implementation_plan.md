# 角色权限管理系统实施计划

系统包括基于 Go 语言的后端开发与基于 React 的前端开发，采用 Monorepo 组织结构，整体实现 RBAC 功能，并提供一键式 Docker 部署支持。在正式编写前后端代码前，将率先使用 Pencil MCP 进行高保真的原型页面架构设计。

## Proposed Changes

### 1. 页面 UI 设计 (Pencil MCP)
在进行代码实施前，使用 Pencil MCP 工具设计项目的核心页面，为前端开发提供准确的视觉基础和结构拆解：
*   **风格指南：** 严格遵循黑白简约风格（Black & White Minimalist），使用大量留白和极简线条，全局语言默认为全中文。相关规范已同步至 `AGENT.md`。
*   **登录页面：** 全中文界面的现代化极简黑白登录页设计。
*   **基础骨架布局与组件：** 包含极简黑白风格的设计组件（输入框、按钮、卡片、弹窗等），以及左侧可折叠菜单、顶部面包屑等。
*   **权限与基础模块（Data Table/Forms）：** 包含以表格为核心的角色管理与用户管理列表、状态切换开关（Switch）、筛选搜索区（Filters）及增删改查表单弹窗。

### 2. 初始化整体目录结构 (Monorepo)
*   **创建根目录及工具链：** 在指定开发目录 `e:\code\Go\zev` 下创建 `zev-go` (后端) 和 `zev-web` (前端)。
*   **配置前端 zev-web Turborepo 根依赖：**
    *   [package.json](file:///e:/code/Go/zev/zev-web/package.json) 工作区声明：[pnpm-workspace.yaml](file:///e:/code/Go/zev/zev-web/pnpm-workspace.yaml)。
    *   Turbo 配置文件：[turbo.json](file:///e:/code/Go/zev/zev-web/turbo.json)。
    *   代码格式化配置：[biome.json](file:///e:/code/Go/zev/zev-web/biome.json)。

### 3. 后端开发方案 (Go)
*   **基础环境与依赖：**
    *   初始化 `go mod`，并配置 `air` 用于本地热重载（生成 `.air.toml`）。
    *   ORM 使用 `gorm` 及 `gorm.io/driver/postgres` 适配 PostgreSQL。
    *   Web 框架采用 `gin`，结合 `swaggo/swag` 自动生成 Swagger API 接口文档。
    *   生成式 CRUD 组件设计：在 `pkg/crud` 中实现通用的 `BaseController` 及 `BaseService`，支持结构体反射或泛型动态处理基础的增删改查。
*   **Cool-Admin 风格目录架构设计：**
    *   在 `zev-go/modules` 下按照功能对系统进行拆分。例如 `modules/system`。
    *   在每个 `modules/xxx/` 下设立以下标准目录结构：
        *   `controller/`: 放 HTTP 接口处理函数。
        *   `service/`: 放业务逻辑。
        *   `entity/` (或 `model/`): 放数据库模型映射。
        *   `dto/`: 放请求参数验证及响应数据结构。
        *   `rpc/`: 放预留的 RPC 服务及协议定义，如 gRPC proto 和实现。
        *   `event/`: 放模块内部或跨模块的事件监听与派发逻辑。
        *   `middleware/` (可选): 存放特定模块的中间件。
        *   `init.go`: 模块路由与事件注册入口。
*   **自研核心包 (`pkg`)：**
    *   `pkg/response/`：统一 JSON 响应格式（code, data, msg）。
    *   `pkg/jwtx/`：JWT 身份认证机制。
    *   `pkg/event/`：提供基础的 Event Bus（事件总线）机制，支持基于内存或 Redis 的发布订阅。
    *   `pkg/crud/`：利用泛型/反射实现的通用 Service 层和 Controller 层快速增删改查基类。

### 4. 前端开发方案 (React + Vite + Turborepo)
*   **创建应用与包：**
    *   `zev-web/apps/admin/`：作为后台管理主应用（使用 Vite + React + TS 初始化）。
    *   `zev-web/packages/ui/`：预留的自定义业务组件库，未来可进行包复用。
*   **主应用基础结构：**
    *   **架构选型**：使用 Zustand 管理应用全局状态（侧边栏开合、登录用户信息、权限路由），使用 React Router 实现页面路由。
    *   **UI 及样式**：集成 Tailwind CSS 及 `shadcn/ui`，辅以 Framer Motion 增加过渡及微动画（Micro-interactions）。
    *   **模块化代码结构**：
        *   `src/api`：存放与后端接口通讯的 Axios 封装。
        *   `src/components`：存放高阶及自定义业务组件。
        *   `src/pages`：业务视图组件。
        *   `src/store`：Zustand 状态文件。
        *   `src/utils`：全局工具类封装。

### 5. 角色与权限 (RBAC) 核心模块实现
*   **后端实体设计**：
    *   `User`（用户表，包含账号、密码哈希等）
    *   `Role`（角色表，如管理员、普通用户）
    *   `Menu/Permission`（菜单或权限控制表）
    *   `UserRole` 与 `RoleMenu`（关联表）。
*   **前端逻辑**：
    *   登录后获取权限树（Menu 列表），Zustand 缓存并配合组件动态渲染左侧菜单。
    *   提供鉴权相关的 Hooks（如 `usePermission`）控制按钮级别的细粒度显示。

### 6. 部署方案 (Docker)
*   编写 `zev-go/Dockerfile` 用于构建 Go 应用。
*   编写 `zev-web/Dockerfile` 用于构建并在 Nginx 下托管前端静态文件。
*   在根目录 `e:\code\Go\zev` 创建 [docker-compose.yml](file:///e:/code/Go/zev/docker-compose.yml)，一键启动包含 postgres、backend、frontend 的容器服务编排。

## Verification Plan

### Automated Tests
1.  **后端测试**：针对 `pkg/crud` 工具包进行基础逻辑测试；生成 Swagger 文件检查路由准确性。
2.  **前端代码与样式检查**：使用 `pnpm lint` 搭配 Biome 检查代码结构和格式合规性。

### Manual Verification
1.  **Pencil 页面设计校验**：查看所有的 `.pen` 草图截图并确认布局和样式组件满足现代后台标准（要求：由用户审阅并认可草图后进入功能开发阶段）。
2.  **系统全链路部署**：`docker-compose up -d --build` 顺利无错启动数据库、后端、前端。
3.  **UI 渲染体验**：浏览器访问前端应用，测试页面过渡、Framer Motion 动画和 shadcn 互动组件的响应情况。
4.  **鉴权业务跑通**：利用提供的内置 admin 账号登录，添加新的测试角色与菜单路由，注销后利用测试账号再度登录，检查前端侧边栏渲染情况是否与数据库权限匹配。
