---
description: 代码编写规范
---

# ZEV 项目 AI 开发指南 (AI Development Guide)

这份指南旨在为参与 ZEV 项目开发的 AI 助手提供明确的架构约束、代码规范与工作流指导。在执行任何代码编写、重构或调试任务时，请严格遵守以下原则。

## 1. 整体架构准则
- **单体仓库 (Monorepo)**：项目根目录为 `e:\code\Go\zev`。后端代码位于 `zev-go`，前端代码位于 `zev-web`，两者逻辑独立。
- **环境隔离**：使用 Docker 和 `docker-compose.yml` 联调前后端与数据库。
- **代码质量要求**：
  - 代码必须规范、结构化、模块化、低耦合、高内聚。
  - 绝不允许出现大段的重复代码，优先抽象和复用。
  - 不允许出现特大文件，文件过大时必须按功能拆分。
  - 必须编写清晰的注释，重点解释“为什么”而不是“是什么”。
  - 代码模块必须 高内聚，低耦合
**代码必须符合规范，结构化，模块化 ，低耦合，高内聚，不允许出现大段的重复代码，必须编写注释**
**不允许出现特大文件，如果文件过大，必须拆分**

## 2. 后端开发规范 (zev-go)
- **技术栈**：Go + Gin + Gorm + PostgreSQL + Swagger。本地开发使用 `air` 进行热重载。
- **模块化结构**：按照功能对系统进行拆分，代码存放在 `modules/{module_name}` 下（例如 `modules/system`）。
- **严格分层架构**：每个模块内部必须遵循以下目录结构和职责划分：
  - `controller/`: 仅负责请求接收、参数校验 (DTO) 与响应格式化。**严禁混入业务逻辑**。
  - `service/`: 负责核心业务逻辑实现。
  - `entity/` (或 `model/`): GORM 数据库结构体映射。
  - `dto/`: 请求参数验证 (Req) 及响应数据结构 (Resp)。
  - `rpc/`: 预留的 RPC 服务及协议定义。
  - `event/`: 模块内部或跨模块的事件监听与派发逻辑。
  - `middleware/`: 存放特定模块的中间件。
  - `init.go`: 模块路由与事件注册的唯一入口。
- **API 响应规范**：所有接口统一通过 `pkg/response` 返回标准化 JSON：`{ "code": 0, "data": ..., "msg": "success" }`，注意良好的注释与 Swagger 标注。。
- **核心基类复用**：
  - 必须使用自研核心包：`pkg/jwtx` (认证), `pkg/event` (事件总线), `pkg/crud` (泛型增删改查)。
- **Swagger 接口文档**：
  - 所有的 API Handler 上方必须编写符合规范的 Swagger 注释。
  - 后台已配置自动执行 `swag init`（例如在 `air` 启动时自动更新），因此只需写好注释并保存即可。
* **自研核心包 (`pkg`)：**
  - `pkg/response/`：统一 JSON 响应格式（code, data, msg）。
  - `pkg/jwtx/`：JWT 身份认证机制。
  - `pkg/event/`：提供基础的 Event Bus（事件总线）机制，支持基于内存或 Redis 的发布订阅。
  - `pkg/crud/`：利用泛型/反射实现的通用 Service 层和 Controller 层快速增删改查基类。
  - `pkg/swagger/`：自动生成 Swagger API 接口文档。

## 3. 前端开发规范 (zev-web)
- **技术栈**：React + Vite + TypeScript + Zustand + React Router。
- **工程化架构**：使用 pnpm workspace + Turborepo。后台主应用位于 `apps/admin`，复用包位于 `packages/ui`。
- **代码规范**：**强制统一使用 Biome** 进行格式化和 Lint 校验，不使用 ESLint/Prettier。**禁止使用 `any` 类型**
要符合eslint规则。
- **UI 及视觉规范**：
 - 强制采用 Tailwind CSS 和 **shadcn/ui** 原生组件库及其细粒度的控制方式组合业务界面。
  - 组件必须遵循模块化、可复用的原则，禁止使用难以扩展的第三方大组件包。
  - 过渡与复杂动画均基于 Framer-motion 进行设计，注重交互反馈和渐入渐出效果 (Micro-interactions)。
- **状态管理**：
  - 全局状态（如路由、权限、用户信息、侧边栏状态）放入 Zustand (`src/store`)。
  - 组件内的局部状态严格放入自身的 `useState`。
- **目录约定 (`apps/admin/src`)**：
  - `api/`：Axios 请求及接口封装。
  - `components/`：高阶及自定义业务组件。
  - `pages/`：业务视图组件。
  - `store/`：Zustand 状态文件。
  - `utils/`：全局工具类封装。
- **国际化**：当前系统默认使用全中文（如“登录”、“用户名”），后续会考虑加入 i18n。
禁止使用原生 alert
使用 sonner
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
## 4. AI 协作与工作流
1. **理解上下文**：在动手修改代码前，先了解相关模块的现有实现，保证代码风格和架构思想一致。
2. **循序渐进**：每当开始新模块时，明确划分各层职责。
3. **视觉驱动**：前端 UI 开发应优先提供视觉设计建议，并在开发完成后自查是否符合极简黑白灰的美学要求。
4. **测试与反馈**：完成后，清晰地向开发者总结做了哪些修改，涉及到哪些核心文件，并建议下一步的验证操作。