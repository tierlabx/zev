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

## 3. 前端开发约束 (React)

- **核心选型**：React + Vite + TypeScript + Zustand + React Router。
- **工程化工具**：pnpm workspace + Turborepo 组织应用 (`apps/admin`) 和复用包 (`packages/ui`)。
- **代码规范和格式化**：统一采用 **Biome** 进行格式化和 Lint 校验，不使用 ESLint/Prettier。
- **UI 及交互基调设计**：
  - 强制采用 Tailwind CSS 和 **shadcn/ui** 原生组件库及其细粒度的控制方式组合业务界面。
  - 组件必须遵循模块化、可复用的原则，禁止使用难以扩展的第三方大组件包。
  - 过渡与复杂动画均基于 Framer-motion 进行设计，注重交互反馈和渐入渐出效果 (Micro-interactions)。
- **页面状态存放约束**：跨组件或路由共享的数据放于 Zustand；组件内局部数据严格放于自身的 useState。

## 4. 提交或演进策略

- 每当开始新模块，明确划分其职责。
- 开发 UI 前，始终可以依赖 Pencil MCP 提供视觉指引与审查；完成开发后提供截图核验。

## 5. UI 视觉与风格约束

- **核心主题**：黑白简约风格 (Black & White Minimalist)。
- **色彩规范**：主要使用黑、白、灰色阶，避免使用高饱和度彩色（仅在必要状态提示时使用极少量的警示色）。
- **组件风格**：采用极简的几何线条和大量留白，减少冗余装饰。
- **页面默认语言**：所有页面和组件必须默认显示为全中文（如“登录”、“用户名”等）。
- **主页面布局规范**：右侧功能内容区（菜单对应的页面）内不要包含正副标题，直接展示核心内容（如表格、表单等），保持极简。
