---
trigger: always_on
---

# ZEV 项目 AI 开发指南 (AI Development Guide)

这份指南旨在为参与 ZEV 项目开发的 AI 助手提供明确的架构约束、代码规范与工作流指导。在执行任何代码编写、重构或调试任务时，请严格遵守以下原则。

## 1. 整体架构准则
- **单体仓库 (Monorepo)**：项目根目录为 `f:\03_OpenSource\zev`（工作区根目录）。后端代码位于 `zev-go`，前端代码位于 `zev-web`，两者逻辑独立。
- **环境隔离**：使用 Docker 和 `docker-compose.yml` 联调前后端与数据库。
- **代码质量要求**：
  - 代码必须规范、结构化、模块化、低耦合、高内聚。
  - 绝不允许出现大段的重复代码，优先抽象和复用。
  - 不允许出现特大文件，文件过大时必须按功能拆分。
  - 必须编写清晰的注释，重点解释“为什么”而不是“是什么”。

**核心原则：代码必须符合规范，结构化，模块化，低耦合，高内聚，不允许出现大段的重复代码，必须编写注释。不允许出现特大文件，如果文件过大，必须拆分。**

## 2. 前端开发规范 (zev-web)
- **技术栈锁定**：React 19 + Vite 8 + TypeScript + Zustand v5 + TanStack Router (`@tanstack/react-router`) + TanStack Query v5 + Tailwind CSS v4 + Recharts v3 + cmdk + Sonner + Storybook 10。
  > [!WARNING]  
  > 本项目使用的是 **Tailwind CSS v4**，请注意 V4 的新特性与配置差异（如无需 `tailwind.config.js`，`components.json` 中 `"config"` 必须为空字符串 `""`，基于 `@theme` 的 CSS 变量定义等），切勿输出 V3 版本的兼容代码。请保持依赖极简整洁，不要引入未使用的 `vaul` 等冗余包。
- **工程化架构**：使用 pnpm workspace。后台主应用位于 `apps/admin`，复用组件库位于 `packages/ui`（`@zev/ui`）。
- **代码校验规范**：**强制统一使用 Biome** 进行格式化和 Lint 校验（`pnpm lint` 即 `biome check --write . && pnpm run typecheck`），不使用 ESLint/Prettier。
  - 严格遵守 Lint 规则，**禁止使用 `any` 类型**。
- **状态管理**：
  - 全局状态（如路由/标签页、权限、用户信息、侧边栏状态、语言偏好）放入 Zustand (`src/store`)。
  - 组件内的局部状态严格放入自身的 `useState`。
- **数据获取机制**：
  - **强制使用 `@tanstack/react-query` v5** 进行服务端数据的拉取、缓存及修改操作（Mutation）。
  - 严禁使用原生 `useEffect` 配合 `axios` 手动管理请求生命周期与 Loading 状态。
- **SPA 无刷新动态路由与会话管理 (`router/session.ts`)**：
  - 路由树在 `src/router/index.tsx` 中注册了运行时桥接（`registerRouterBridge`）。
  - **严禁**在登录、退出登录、401 鉴权失效或菜单会话恢复时调用 `window.location.href = "/login"` 或 `window.location.reload()`（标签栏菜单中用户主动点击“刷新当前页”除外）。
  - 必须统一调用 `@/router/session` 提供的 `syncRouterRoutes(menus)`、`invalidateRouter()` 或幂等防重入的 `clearSessionAndRedirectToLogin()`（基于 `router.update({ routeTree })`、`useTagsStore.getState().resetViews()` 与 `queryClient.clear()` 实现无刷新平滑切换）。
  - `src/router/routes.tsx` 中的 `RootLayout` 必须保持为模块顶层稳定组件引用，防止重建路由树时卸载重挂 `<App>`。
- **UI 及视觉规范**：
  - 强制采用 Tailwind CSS 和 **shadcn/ui** 原生组件库及其细粒度的控制方式组合业务界面。组件包从 `@zev/ui` 导入。
  - 极简黑白灰美学 (Black & White Minimalist)：主色调使用黑、白、灰色阶，避免高饱和度彩色（仅警示色与语义状态色例外）。减少冗余装饰。
  - **页面禁止主副标题**：所有业务视图组件（右侧主内容区）内**绝对禁止**包含任何无意义的顶部正副标题（如“数据概览”、“欢迎回来”等），进入页面后应直接呈现核心数据区域（如表格、表单或卡片）。
- **Animate UI 图标、动效与背景规范**：
  - 动画与交互过渡基于 **Animate UI** (`@animate-ui/react` + `motion/react`) 进行设计，严格遵循减弱动态偏好 (`useShouldReduceMotion`) 与语义化 Token，但在涉及到虚拟滚动的表格 (`ZevTable`) 行内**严禁使用进场动画或动画图标**以保证 60FPS 极致性能。
  - 导航、顶栏、通知铃铛、弹窗主操作按钮等交互核心区，优先使用 `@zev/ui/components/animate-ui/icons/*` 配合 `<AnimateIcon animateOnHover asChild>` 实现整颗按钮/菜单项悬停播放动画。
  - **防 `asChild` 冲突**：遇到 Radix 的 `Trigger asChild`（`PopoverTrigger`、`DropdownMenuTrigger`、`SheetTrigger`）时，必须将 `<AnimateIcon animateOnHover>` 置于触发按钮内部，禁止双层 `asChild` 叠加。
  - **弹出层防遮挡红线**：**严禁**在基于 `@animate-ui/react/primitives/radix-ui/*` 的弹出层（如 `DropdownMenuContent`、`PopoverContent`）上传入 `forceMount`，避免关闭态透明容器以 `z-50` 拦截下方页面点击；`DropdownMenuContent` 必须保留 `data-[state=closed]:pointer-events-none`。
  - **动态背景约定**：`@zev/ui/components/animate-ui/backgrounds/{stars,gravity-stars}` 仅用于 `NotFound.tsx` 等非高频数据页；**登录页 (`Login.tsx`) 固定保留原 WebGPU 锦鲤着色器 `ShaderKoiBackground`，禁止替换为其他背景或增加背景切换控件**。
  - **Registry 接入检查**：后续若通过 `@animate-ui` registry 新拉取组件到 `packages/ui/src/components/animate-ui/`，必须检查其 `cn` 导入指向 `@zev/ui/lib/utils`，并清理未使用的 `import * as React` 以满足 `noUnusedLocals`。
- **数据可视化、全局命令面板与组件工作台**：
  - 图表统一使用 `@zev/ui/components/chart`（Recharts v3 兼容封装）。**禁止运行 `shadcn add chart`**，以免 CLI 将 Recharts 降级到 v2 并覆盖 `card.tsx`。
  - 仪表盘遥测与 KPI 组件优先复用 `@zev/ui/components/{tracker,bar-list,delta-badge}`（Tremor Raw 风格：24h 状态心跳条、横向占比条、环比涨跌徽章）。
  - 全局搜索与快捷指令集中维护在 `layouts/dashboard/components/global-search.tsx`（基于 `cmdk`，`⌘K`/`Ctrl+K` 唤起），支持最近访问、带图标页面路由与系统快捷操作（切换主题/语言/侧边栏/全屏/跳转/退出登录）。
  - **Storybook 预览工作台**：`apps/admin/.storybook/` 已接入 Storybook 10，支持 `pnpm storybook` 与 `pnpm build-storybook`。新增或大幅调整 `@zev/ui` 基础组件及复杂业务组件（如 `ZevTable`）时，应同步补充或维护对应的 `*.stories.tsx`。
- **目录与模块约定 (`apps/admin/src`)**：
  - `api/`：Axios 请求封装及具体接口定义。
    - **`api/interface/`**：存放所有的实体结构定义（Entities/Models）。
    - **`api/dto/`**：存放所有的请求参数和响应数据结构定义（Data Transfer Objects）。
  - `components/`：高阶及自定义业务组件。
  - `pages/`：业务视图组件。**页面内禁止包含任何顶部标题或副标题，必须直接展示功能。**
  - `router/`：TanStack Router 路由构建 (`routes.tsx`, `dynamic-routes.ts`, `static-routes.ts`, `route-guards.ts`, `session.ts`)。
  - `store/`：Zustand 状态文件。
  - `utils/`：全局工具类封装。**前端工具函数必须统一放在此目录，严禁散落在业务组件中**。
- **表单与交互规范**：
  - 必须使用 `react-hook-form` 配合 `zod` 进行表单状态管理与数据校验。
  - 界面提示必须使用 `sonner` 提供的 `toast`（异步导出等耗时操作优先使用 `toast.promise()`），禁止使用原生 `alert`。
- **多语言约束**：页面默认全中文（如“登录”、“用户名”），新增词条必须同步维护 `src/locales/zh-CN.ts` 与 `src/locales/en-US.ts`（`LocaleSchema<typeof zhCN>` 强约束）。

# UI Interactions

- Do NOT use native browser popups such as `window.confirm`, `window.alert`, or `window.prompt`.
- For confirmation dialogs (e.g. before deleting records), always use the custom hook from `@/hooks/use-confirm`:
  ```tsx
  import { useConfirm } from "@/hooks/use-confirm";

  function MyComponent() {
    const { confirm, ConfirmDialog } = useConfirm();

    const handleDelete = () => {
      confirm("确定要删除吗？", () => {
        // Execute deletion logic here
      });
    };

    return (
      <div>
        <button onClick={handleDelete}>Delete</button>
        <ConfirmDialog />
      </div>
    );
  }
  ```

## 3. 后端开发规范 (zev-go)
- **技术栈锁定**：Go 1.25 + Gin v1.12 + Gorm v1.31 + PostgreSQL + Swagger。本地开发使用 `air`。
- **模块化结构**：按照功能对系统进行拆分，代码存放在 `modules/{module_name}` 下（例如 `modules/system`）。
- **严格的分层架构**：
  - `controller/`: **极度轻量化**。仅负责请求接收、参数校验 (DTO绑定) 与响应格式化。**严禁混入任何业务逻辑（如密码加密、数据拼装），严禁直接调用 DB（即便是通过 `service.DB`）**。
  - `service/`: 负责所有核心业务逻辑实现与数据库操作调度。复杂的数据拼装、鉴权计算必须在这里完成（如 Dashboard 多维度小时级聚合指标拆分在 `service/dashboard_metrics.go`）。
  - `entity/`: GORM 数据库映射结构体。
  - `dto/`: 请求参数验证 (Req) 及响应数据结构 (Resp)。**所有 DTO 必须集中在此目录，严禁在 controller 内就地定义结构体**。
  - `init.go`: 模块路由与事件注册的唯一入口。
- **API 响应规范**：所有接口必须统一通过 `pkg/response` 返回标准化 JSON：`{ "code": 200, "data": ..., "msg": "..." }`。
- **核心基类复用 (pkg)**：
  - `pkg/jwtx`：JWT 身份认证机制。
  - `pkg/event`：提供基础的 Event Bus（事件总线）机制，支持基于内存或 Redis 的发布订阅。
  - `pkg/crud`：利用泛型实现的通用 Service 和 Controller 快速增删改查基类，必须优先继承使用以减少样板代码。
  - `pkg/swagger`：自动生成 Swagger API 接口文档。
- **Swagger 接口文档**：所有的 API Handler 上方必须编写符合规范的 Swagger 注释。后台 `air` 会自动触发 `swag init`。
注意seed.json 仅在 项目初始化时使用
## 4. AI 协作与工作流
1. **理解上下文**：在动手修改代码前，先了解相关模块的现有实现，保证代码风格和架构思想一致。
2. **循序渐进**：每当开始新模块时，明确划分各层职责。
3. **视觉驱动**：前端 UI 开发应优先提供视觉设计建议，并在开发完成后自查是否符合极简黑白灰的美学要求。
4. **测试与反馈**：完成后，清晰地向开发者总结做了哪些修改，涉及到哪些核心文件，并建议下一步的验证操作。

## 要求文件极致整洁，极致性能
