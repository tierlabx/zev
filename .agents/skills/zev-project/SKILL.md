---
name: zev-project
description: Provides core guidelines, architectural constraints, and standard operating procedures for developing the ZEV project. Triggers on requests related to "zev", "zev-web", "zev-go", or when working inside the ZEV monorepo.
---

# ZEV 项目 AI 开发专属技能 (ZEV Project Skill)

如果你在处理有关 ZEV 项目的开发任务，你**必须**遵守本技能中定义的开发规范与最佳实践。ZEV 是一个要求**极致整洁、极致性能**的系统。

## 1. 全局架构约束
- **仓库结构**：本项目是单体仓库 (Monorepo)。后端 `zev-go`，前端 `zev-web`。
- **美学与布局**：采用极简黑白灰美学。所有业务视图组件（如 `apps/admin/src/pages/` 下的页面），**绝对禁止**出现无意义的顶部正副标题（如“数据概览”、“欢迎使用”等）。页面主要区域应当直接用来呈现功能（表格、表单）。表格应当被收纳在 `Card` 内部。
- **代码质量**：不允许大段重复代码，不允许超大文件，代码必须具备清晰的“为什么”注释。

## 2. 前端规范 (zev-web)
- **技术栈**：React 19 + Vite 8 + TypeScript + Zustand v5 + TanStack Router (`@tanstack/react-router`) + TanStack Query v5 + Tailwind CSS v4 + Recharts v3 + Three.js + cmdk + Sonner + Storybook 10（登录页 `ShaderKoiBackground` 固定采用懒加载 Three.js WebGL 3D 黑白线稿锦鲤水池）。
  - **重要提醒**：使用的是 Tailwind CSS v4，禁止使用 V3 语法与 `tailwind.config.js` 模式，`components.json` 中 `"config"` 必须保持为 `""`；禁止引入未使用的 `vaul` 等冗余依赖。
- **代码校验**：统一使用 `biome check .`，不使用 ESLint/Prettier。严格禁止使用 `any` 类型。
- **数据获取**：服务端请求必须使用 `@tanstack/react-query` v5。严禁在组件中手写 `useEffect` 配合 `axios`。
- **SPA 无刷新路由与会话切换**：
  - 严禁在登录、退出登录、401 失效或菜单恢复时调用 `window.location.href = "/login"` 或 `window.location.reload()`（标签栏主动“刷新当前页”按钮除外）。
  - 必须统一通过 `@/router/session` 导出的 `syncRouterRoutes(menus)`、`invalidateRouter()`、`clearSessionAndRedirectToLogin()` 在运行时重建路由树并清理 `useTagsStore.resetViews()` 与 `queryClient.clear()`；`router/routes.tsx` 中的 `RootLayout` 必须保持稳定的命名组件引用。
- **UI 组件库与数据可视化**：
  - 基础组件基于 `shadcn/ui`，统一从 `@zev/ui` 导入。
  - 图表统一使用 `@zev/ui/components/chart`（Recharts v3 封装），**严禁运行 `shadcn add chart`**（会导致 Recharts 降级并覆盖 `card.tsx`）。
  - 仪表盘遥测/KPI 组件优先复用 `@zev/ui/components/{tracker,bar-list,delta-badge}`。
  - 禁用 `forceMount`：基于 `@animate-ui/react/primitives/radix-ui/*` 的弹出层（`DropdownMenuContent`、`PopoverContent` 等）**严禁传入 `forceMount`**，`DropdownMenuContent` 需保留 `data-[state=closed]:pointer-events-none`，避免关闭态透明容器拦截点击。
- **Animate UI 图标、动效与背景**：
  - 交互核心区优先使用 `@zev/ui/components/animate-ui/icons/*` + `<AnimateIcon animateOnHover asChild>`；若父级已是 Radix `Trigger asChild`，必须把 `<AnimateIcon animateOnHover>` 放入触发按钮内部，避免双层 `asChild` 冲突。
  - 虚拟滚动表格（`ZevTable`）行内**严禁使用进场动画或动画图标**，确保 60FPS 滚动性能。
  - `@zev/ui/components/animate-ui/backgrounds/{stars,gravity-stars}` 仅用于非高频数据页（如 `NotFound.tsx`）；**登录页 (`Login.tsx`) 固定保留原 WebGPU 锦鲤着色器 `ShaderKoiBackground`，禁止替换或增加背景切换控件**。
  - 从 `@animate-ui` registry 新拉取图标或背景时，务必把 `cn` 导入修正为 `@zev/ui/lib/utils` 并移除未使用的 `import * as React`。
- **全局命令面板、表单与通知**：
  - 全局搜索与快捷指令维护在 `layouts/dashboard/components/global-search.tsx`（`cmdk`，`⌘K`/`Ctrl+K`）。
  - 表单必须使用 `react-hook-form` + `zod`；提示统一使用 `sonner`（耗时异步操作如 CSV 导出使用 `toast.promise()`）；确认弹窗必须使用 `@/hooks/use-confirm`，禁止原生 `window.confirm` / `alert`。
- **Storybook 组件工作台**：
  - 新增或调整 `@zev/ui` 公共组件及 `ZevTable` 等复杂组件时，应维护对应 `*.stories.tsx`，可通过 `pnpm storybook` 独立预览并通过 `pnpm build-storybook` 校验构建。
- **改动后必须执行 pnpm lint**：前端改动后必须执行 `pnpm lint` 然后修复所有问题。

## 3. 后端规范 (zev-go)
- **技术栈**：Go 1.25 + Gin v1.12 + Gorm v1.31 + PostgreSQL + Swagger。
- **三层架构 (严格)**：
  - `controller/`: 极度轻量化，只做路由和数据绑定，禁止业务逻辑和直接调 DB。
  - `service/`: 所有核心业务逻辑、权限控制存放于此（如仪表盘 14 天趋势、24h 心跳与模块聚合逻辑拆分在 `service/dashboard_metrics.go`）。
  - `entity/` 和 `dto/`: 所有 Req/Resp 结构体存放在 `dto/`，映射存放在 `entity/`，禁止在 controller 里就地定义结构体。
- **基类与响应**：优先使用 `pkg/crud` 的泛型基类，所有接口必须通过 `pkg/response` 统一格式化返回。
- **文档**：每个接口必须包含规范的 Swagger 注释。

## 4. 开发工作流
- 修改任何文件前，先理解已有模块的风格，保持 100% 一致。
- 前端页面开发完毕后，请自动按极简美学自查。
- 本技能的规范与项目根目录 `.agents/rules/code.md` 保持同步。每次有重大的架构调整，请记得同步更新该 md 文件以及此技能文件。

## 5. 前端高级组件与布局指南
- **自适应填充布局 (Flexbox 弹性链)**：
  为了实现完美不溢出的滚动区域，页面的外层结构必须使用完整的 Flexbox 链条包裹：
  `div.flex-1.flex.flex-col.space-y-4.min-h-0` -> 内部 `Card.flex-1.flex.flex-col.p-4.min-h-0` -> 内部需要占据剩余所有高度的组件（如 `ZevTable`）使用 `className="flex-1 min-h-0"`。
- **ZevTable 进阶用法**：
  - **列宽设置**：不需要写复杂的 CSS，只需在 Column 定义中传入 `size: 100`（数字代表 px 宽度）。
  - **列固定 (Pinning)**：对于需要永远悬停在屏幕左侧或右侧的列（如操作列），只需在列配置中添加 `meta: { fixed: "right" }` 或 `meta: { fixed: "left" }` 即可实现类似 Element UI 的悬浮列效果。
  - **列宽拖拽**：ZevTable 已经内置支持鼠标拖拽调整列宽，无需手动编写。
