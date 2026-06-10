---
trigger: glob
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

**核心原则：代码必须符合规范，结构化，模块化，低耦合，高内聚，不允许出现大段的重复代码，必须编写注释。不允许出现特大文件，如果文件过大，必须拆分。**

## 2. 前端开发规范 (zev-web)
- **技术栈锁定**：React 19 + Vite 8 + TypeScript + Zustand v5 + React Router v7 + Tailwind CSS v4。
  > [!WARNING]  
  > 本项目使用的是 **Tailwind CSS v4**，请注意 V4 的新特性与配置差异（如无需繁琐的 `tailwind.config.js`，基于 `@theme` 的 CSS 变量定义等），切勿输出 V3 版本的兼容代码。
- **工程化架构**：使用 pnpm workspace + Turborepo。后台主应用位于 `apps/admin`，复用包位于 `packages/ui`。
- **代码校验规范**：**强制统一使用 Biome** 进行格式化和 Lint 校验（`biome check .`），不使用 ESLint/Prettier。
  - 严格遵守 Lint 规则，**禁止使用 `any` 类型**。
- **状态管理**：
  - 全局状态（如路由、权限、用户信息、侧边栏状态）放入 Zustand (`src/store`)。
  - 组件内的局部状态严格放入自身的 `useState`。
- **数据获取机制**：
  - **强制使用 `@tanstack/react-query` v5** 进行服务端数据的拉取、缓存及修改操作（Mutation）。
  - 严禁使用原生 `useEffect` 配合 `axios` 手动管理请求生命周期与 Loading 状态。
- **UI 及视觉规范**：
  - 强制采用 Tailwind CSS 和 **shadcn/ui** 原生组件库及其细粒度的控制方式组合业务界面。组件包从 `@zev/ui` 导入。
  - 极简黑白灰美学 (Black & White Minimalist)：主色调使用黑、白、灰色阶，避免高饱和度彩色（仅警示色例外）。减少冗余装饰。
  - 动画与交互过渡基于 **Framer-motion v12** 进行设计。
- **目录与模块约定 (`apps/admin/src`)**：
  - `api/`：Axios 请求封装及具体接口定义。
    - **`api/interface/`**：存放所有的实体结构定义（Entities/Models）。
    - **`api/dto/`**：存放所有的请求参数和响应数据结构定义（Data Transfer Objects）。
  - `components/`：高阶及自定义业务组件。
  - `pages/`：业务视图组件。右侧页面内不要包含无意义的顶部正副标题，直接呈现表格或表单。
  - `store/`：Zustand 状态文件。
  - `utils/`：全局工具类封装。
- **表单与交互规范**：
  - 必须使用 `react-hook-form` 配合 `zod` 进行表单状态管理与数据校验。
  - 界面提示必须使用 `sonner` 提供的 `toast`，禁止使用原生 `alert`。
- **多语言约束**：页面默认全中文（如“登录”、“用户名”）。
 ** 页面内不需要标题

## 3. 后端开发规范 (zev-go)
- **技术栈锁定**：Go 1.25 + Gin v1.12 + Gorm v1.31 + PostgreSQL + Swagger。本地开发使用 `air`。
- **模块化结构**：按照功能对系统进行拆分，代码存放在 `modules/{module_name}` 下（例如 `modules/system`）。
- **严格的分层架构**：
  - `controller/`: **极度轻量化**。仅负责请求接收、参数校验 (DTO绑定) 与响应格式化。**严禁混入任何业务逻辑**。
  - `service/`: 负责所有核心业务逻辑实现与数据库操作调度。
  - `entity/`: GORM 数据库映射结构体。
  - `dto/`: 请求参数验证 (Req) 及响应数据结构 (Resp)。
  - `init.go`: 模块路由与事件注册的唯一入口。
- **API 响应规范**：所有接口必须统一通过 `pkg/response` 返回标准化 JSON：`{ "code": 200, "data": ..., "msg": "..." }`。
- **核心基类复用 (pkg)**：
  - `pkg/jwtx`：JWT 身份认证机制。
  - `pkg/event`：提供基础的 Event Bus（事件总线）机制，支持基于内存或 Redis 的发布订阅。
  - `pkg/crud`：利用泛型实现的通用 Service 和 Controller 快速增删改查基类，必须优先继承使用以减少样板代码。
  - `pkg/swagger`：自动生成 Swagger API 接口文档。
- **Swagger 接口文档**：所有的 API Handler 上方必须编写符合规范的 Swagger 注释。后台 `air` 会自动触发 `swag init`。

## 4. AI 协作与工作流
1. **理解上下文**：在动手修改代码前，先了解相关模块的现有实现，保证代码风格和架构思想一致。
2. **循序渐进**：每当开始新模块时，明确划分各层职责。
3. **视觉驱动**：前端 UI 开发应优先提供视觉设计建议，并在开发完成后自查是否符合极简黑白灰的美学要求。
4. **测试与反馈**：完成后，清晰地向开发者总结做了哪些修改，涉及到哪些核心文件，并建议下一步的验证操作。