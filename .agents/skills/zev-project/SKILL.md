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
- **技术栈**：React 19 + Vite 8 + TypeScript + Zustand v5 + React Router v7 + Tailwind CSS v4。
  - **重要提醒**：使用的是 Tailwind CSS v4，禁止使用 V3 语法和 `tailwind.config.js` 模式。
- **代码校验**：统一使用 `biome check .`，不使用 ESLint/Prettier。严格禁止使用 `any` 类型。
- **数据获取**：服务端请求必须使用 `@tanstack/react-query` v5。严禁在组件中手写 `useEffect` 配合 `axios`。
- **UI 组件库**：基于 `shadcn/ui`，并从 `@zev/ui` 导入。
- **动画机制**：动画使用 `framer-motion`，但在高性能的虚拟滚动表格（`ZevTable`）中**严禁使用进场动画**，以确保 60FPS 满血滚动性能。
- **表单交互**：必须使用 `react-hook-form` + `zod`，提示统一使用 `sonner` (`toast`)。弹窗确认必须使用自带的 `useConfirm` hook，禁止使用浏览器原生 `window.confirm`。
- **改动后必须执行 pnpm lint**： 前端改动后必须执行pnpm lint 然后修复所有问题
## 3. 后端规范 (zev-go)
- **技术栈**：Go 1.25 + Gin v1.12 + Gorm v1.31 + PostgreSQL + Swagger。
- **三层架构 (严格)**：
  - `controller/`: 极度轻量化，只做路由和数据绑定，禁止业务逻辑和直接调 DB。
  - `service/`: 所有核心业务逻辑、权限控制存放于此。
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
