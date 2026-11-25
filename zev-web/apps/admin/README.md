# Zev Admin

这是 **Zev** 项目的后台管理前端应用。它作为 Monorepo 工作区的一部分，采用了现代、高性能的 Web 开发技术栈。

## 技术栈

- **框架**: React 19 + TypeScript + Vite 8
- **路由**: TanStack Router (`@tanstack/react-router`)
- **状态与缓存**: Zustand v5 (全局状态), TanStack Query v5 (服务端状态 & API 缓存)
- **样式与动效**: Tailwind CSS v4, Animate UI (`@animate-ui/react`), Motion
- **UI 组件库**: `@zev/ui` (`shadcn/ui`, Radix UI primitives, Recharts v3, `cmdk`, `sonner`)
- **表单与校验**: React Hook Form + Zod
- **代码规范与预览**: Biome + Storybook 10

## 目录结构

```text
src/
├── api/          # 接口请求封装、DTO/实体定义和 React Query Hooks（按模块划分，如 system）
├── assets/       # 静态资源（SVG Logo 等）
├── components/   # 业务组件（ZevTable 虚拟滚动表格、ShaderKoiBackground 锦鲤着色器等）
├── hooks/        # 全局交互 Hooks（useConfirm、usePermission、useNoticeStream 等）
├── i18n/         # 国际化与强类型字典校验
├── layouts/      # 页面布局（Sidebar、Header、TagsView、⌘K 全局命令面板、通知弹出层）
├── locales/      # 中英文语言包（zh-CN.ts / en-US.ts）
├── pages/        # 业务路由页面（Dashboard 模块化仪表盘、Login、系统管理等）
├── router/       # TanStack Router 路由构建、守卫与无刷新会话桥接 (session.ts)
├── store/        # Zustand 全局状态切片（user、layout、locale、tags）
└── utils/        # 全局工具类（图标映射 menu-icons、树工具、菜单工具、下载等）
```

## 快速开始

该项目属于 `pnpm` 工作区（Workspace），推荐在 `zev-web` 根目录运行指令：

```bash
# 安装依赖
pnpm install

# 启动开发服务器（/api 默认代理到 http://localhost:8080）
pnpm run dev

# 启动 Storybook 独立调试组件与 ZevTable（无需启动后端）
pnpm run storybook

# 运行 Biome Lint + TypeScript 类型检查
pnpm run lint

# 生产环境构建
pnpm run build
```

## 核心架构特性

- **无刷新动态路由重建 (`src/router/session.ts`)**：通过 `router.update({ routeTree })` 在运行时同步重建业务路由树，登录、退出登录及 401 会话过期均以纯 SPA 方式清理 `useTagsStore` 与 `queryClient` 并跳转，杜绝整页硬刷新闪烁；`RootLayout` 保持顶层稳定引用防止 `<App>` 重挂载。
- **全局命令面板 (`⌘K` / `Ctrl+K`)**：`layouts/dashboard/components/global-search.tsx` 基于 `cmdk` 提供最近访问路由、带菜单图标的路由搜索，以及主题/语言/侧边栏/全屏/退出等快捷指令。
- **模块化仪表盘 (`src/pages/dashboard/`)**：结合 Recharts v3 `ChartContainer` 与 Tremor 风格 `Tracker` / `BarList` / `DeltaBadge`，展示 KPI 环比微曲线、14 天操作/登录/用户趋势、24h 服务心跳及近 7 天活跃模块分布。
- **性能与交互红线**：
  - 登录页固定保留 WebGPU `ShaderKoiBackground` 锦鲤着色器背景；404 页面采用轻量 `GravityStarsBackground`。
  - `ZevTable` 虚拟滚动表格行内禁止引入进场动画或动画图标；全站交互核心区图标使用 Animate UI 悬停动效。
  - 下拉菜单等弹出层禁止传入 `forceMount`，避免关闭态透明遮罩阻挡下方按钮点击。
