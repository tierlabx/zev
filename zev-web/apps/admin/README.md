# Zev Admin

这是 **Zev** 项目的后台管理前端应用。它作为 Monorepo 工作区的一部分，采用了现代、高性能的 Web 开发技术栈。

## 技术栈

- **框架**: React 19 + TypeScript + Vite
- **路由**: React Router (v7)
- **状态管理**: Zustand (全局状态), React Query (服务端状态 & API 缓存)
- **样式**: Tailwind CSS v4, Framer Motion (动画效果)
- **UI 组件库**: `shadcn/ui`, Radix UI primitives
- **表单与校验**: React Hook Form + Zod
- **代码规范**: Biome (极致的格式化与 Lint 工具)

## 目录结构

```text
src/
├── api/          # 接口请求封装和 React Query Hooks（按模块划分，如 system）
├── assets/       # 静态资源（图片、SVG 以及全局 CSS）
├── components/   # 公共 UI 组件（通常从工作区的 UI package 中导入）
├── layouts/      # 页面布局模板（例如包含侧边栏和顶栏的 DashboardLayout）
├── pages/        # 业务路由页面（如 Login、Dashboard、UserManagement 等）
├── router/       # React Router 路由配置与菜单元数据定义
├── store/        # Zustand 全局状态切片（如用户的 Token 管理）
└── App.tsx       # 根组件，用于挂载各种全局 Providers (如 React Query、全局提示等)
```

## 快速开始

因为该项目属于 `pnpm` 工作区（Workspace），推荐在项目根目录运行指令。

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

启动 Vite 本地开发服务器：

```bash
# 从工作区根目录启动 admin：
pnpm run dev

# 或者直接在 apps/admin 目录内启动：
pnpm run dev
```

### 生产环境构建

```bash
# 从工作区根目录执行：
pnpm run build
```

### 代码检查与格式化

本项目使用 [Biome](https://biomejs.dev/) 作为 Lint 和格式化工具，速度极快。

```bash
pnpm run lint
pnpm run format
```

## 核心架构设计

- **API 接口管理与缓存**：所有的网络请求均统一收敛在 `src/api/[module]` 目录下。底层使用 Axios 拦截器处理 Token 和全局异常，上层组件统一通过 `@tanstack/react-query` 提供的 Hooks 进行调用。这使得组件内部无需手动管理 `loading` 和 `error` 状态。
- **动态路由与菜单配置**：侧边栏的菜单项不是硬编码的，而是自动根据 `src/router/routes.tsx` 中的路由配置动态渲染。菜单的名称（title）和图标（icon）等元数据统一保存在每一个路由对象的 `handle` 属性中，实现了菜单和路由的完全一致。
