# ZEV RBAC 项目开发约束 (AGENT.md)

本文件作为核心向导，约束大语言模型与开发者的后续工作，确保项目风格及代码结构的一致性和标准化。

## 1. 整体架构准则

- **单体仓库 (Monorepo)**：项目存放于 `e:\code\Go\zev` 目录下，后端为 `zev-go`，前端为 `zev-web`，两者逻辑独立。
- **环境隔离**：使用 Docker 和 docker-compose.yml 联调前后端与数据库。

**代码必须符合规范，结构化，模块化 ，低耦合，高内聚，不允许出现大段的重复代码，必须编写注释**
**不允许出现特大文件，如果文件过大，必须拆分**

## 2. 后端开发约束 (Go)

- **核心选型**：Go + Gin + Gorm + PostgreSQL + Swagger。
- **运行方式**：使用 `air` 工具进行热重载开发。
- **结构规范 (类似 cool-admin)**：
  - 采用模块化划分：`modules/{module_name}`。
  - 每个模块内严格分层：`controller`, `service`, `entity`, `dto`, `rpc`, `event`, `middleware`, `init.go`。
  - `controller` 仅负责请求接收、参数校验 (DTO) 与响应格式化，不得混入业务逻辑。
  - `service` 负责核心业务实现。
  - `entity` (或 `model`) 负责 GORM 结构体映射。
  - 核心基类和工具必须封装在 `pkg` 下（例如 `pkg/crud` 和 `pkg/event`）。
- **代码规范**：所有接口统一返回 `pkg/response` 的标准化 JSON `{ "code": 0, "data": ..., "msg": "success" }`，注意良好的注释与 Swagger 标注。
  - **基础环境与依赖：**
  - 初始化 `go mod`，并配置 `air` 用于本地热重载（生成 `.air.toml`）。
  - ORM 使用 `gorm` 及 `gorm.io/driver/postgres` 适配 PostgreSQL。
  - Web 框架采用 `gin`，结合 `swaggo/swag` 自动生成 Swagger API 接口文档。
  - 生成式 CRUD 组件设计：在 `pkg/crud` 中实现通用的 `BaseController` 及 `BaseService`，支持结构体反射或泛型动态处理基础的增删改查。

* **风格目录架构设计：**
  - 在 `zev-go/modules` 下按照功能对系统进行拆分。例如 `modules/system`。
  - 在每个 `modules/xxx/` 下设立以下标准目录结构：
    - `controller/`: 放 HTTP 接口处理函数。
    - `service/`: 放业务逻辑。
    - `entity/` (或 `model/`): 放数据库模型映射。
    - `dto/`: 放请求参数验证及响应数据结构。
    - `rpc/`: 放预留的 RPC 服务及协议定义，如 gRPC proto 和实现。
    - `event/`: 放模块内部或跨模块的事件监听与派发逻辑。
    - `middleware/` (可选): 存放特定模块的中间件。
    - `init.go`: 模块路由与事件注册入口。
* **自研核心包 (`pkg`)：**
  - `pkg/response/`：统一 JSON 响应格式（code, data, msg）。
  - `pkg/jwtx/`：JWT 身份认证机制。
  - `pkg/event/`：提供基础的 Event Bus（事件总线）机制，支持基于内存或 Redis 的发布订阅。
  - `pkg/crud/`：利用泛型/反射实现的通用 Service 层和 Controller 层快速增删改查基类。

## 3. 前端开发约束 (React)

- **核心选型**：React + Vite + TypeScript + Zustand + React Router。
- **工程化工具**：pnpm workspace + Turborepo 组织应用 (`apps/admin`) 和复用包 (`packages/ui`)。
- **代码规范和格式化**：统一采用 **Biome** 进行格式化和 Lint 校验，不使用 ESLint/Prettier。
- **UI 及交互基调设计**：
  - 强制采用 Tailwind CSS 和 **shadcn/ui** 原生组件库及其细粒度的控制方式组合业务界面。
  - 组件必须遵循模块化、可复用的原则，禁止使用难以扩展的第三方大组件包。
  - 过渡与复杂动画均基于 Framer-motion 进行设计，注重交互反馈和渐入渐出效果 (Micro-interactions)。
- **页面状态存放约束**：跨组件或路由共享的数据放于 Zustand；组件内局部数据严格放于自身的 useState。
  **禁止使用any 类型**
  _ **模块化代码结构**：
  _ `src/api`：存放与后端接口通讯的 Axios 封装。
  _ `src/components`：存放高阶及自定义业务组件。
  _ `src/pages`：业务视图组件。
  _ `src/store`：Zustand 状态文件。
  _ `src/utils`：全局工具类封装。

* **创建应用与包：**
  - `zev-web/apps/admin/`：作为后台管理主应用（使用 Vite + React + TS 初始化）。
  - `zev-web/packages/ui/`：预留的自定义业务组件库，未来可进行包复用。
* **主应用基础结构：**
  - **架构选型**：使用 Zustand 管理应用全局状态（侧边栏开合、登录用户信息、权限路由），使用 React Router 实现页面路由。
  - **UI 及样式**：集成 Tailwind CSS 及 `shadcn/ui`，辅以 Framer Motion 增加过渡及微动画（Micro-interactions）。
* **配置前端 zev-web Turborepo 根依赖：**
  - [package.json](file:///e:/code/Go/zev/zev-web/package.json) 工作区声明：[pnpm-workspace.yaml](file:///e:/code/Go/zev/zev-web/pnpm-workspace.yaml)。
  - Turbo 配置文件：[turbo.json](file:///e:/code/Go/zev/zev-web/turbo.json)。
  - 代码格式化配置：[biome.json](file:///e:/code/Go/zev/zev-web/biome.json)。

## 4. 提交或演进策略

- 每当开始新模块，明确划分其职责。
- 开发 UI 前，始终可以依赖 Pencil MCP 提供视觉指引与审查；完成开发后提供截图核验。

## 5. UI 视觉与风格约束

- **核心主题**：黑白简约风格 (Black & White Minimalist)。
- **色彩规范**：主要使用黑、白、灰色阶，避免使用高饱和度彩色（仅在必要状态提示时使用极少量的警示色）。
- **组件风格**：采用极简的几何线条和大量留白，减少冗余装饰。
- **页面默认语言**：所有页面和组件必须默认显示为全中文（如“登录”、“用户名”等）。
- **主页面布局规范**：右侧功能内容区（菜单对应的页面）内不要包含正副标题，直接展示核心内容（如表格、表单等），保持极简。

## 本系统默认中文，后续会考虑增加i18n
