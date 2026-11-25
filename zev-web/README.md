# Zev Web Frontend

Zev 项目的现代前端工程，采用 **pnpm workspace** 搭建的 Monorepo（单体仓库）架构。

## 🚀 技术栈

本项目采用了目前最前沿且高效的前端技术栈：

- **核心框架**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite 8](https://vitejs.dev/) - 极速的开发服务器和打包工具
- **路由管理**: [TanStack Router](https://tanstack.com/router) - 类型安全且支持运行时无刷新重建动态路由树
- **状态与缓存**: [Zustand v5](https://zustand-demo.pmnd.rs/) + [TanStack Query v5](https://tanstack.com/query)
- **样式与组件**:
  - [Tailwind CSS v4](https://tailwindcss.com/) - 基于 `@theme` CSS 变量的现代样式方案
  - [shadcn/ui](https://ui.shadcn.com/) - 可定制的无头 UI 组件库
  - **animate-ui** - 基于 `@animate-ui/react` + Motion 的动画原语、动画图标与交互背景
  - **Recharts v3 / cmdk / Sonner** - 图表可视化、全局 `⌘K` 命令面板与堆叠通知
- **表单与验证**:
  - [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) - 类型安全的表单状态与数据校验
- **工程与预览**: [Biome](https://biomejs.dev/)（格式化与 Lint）+ [Storybook 10](https://storybook.js.org/)（组件独立调试台）

## 📂 目录结构

基于 pnpm workspaces 划分：

```text
zev-web/
├── apps/
│   └── admin/              # 管理后台子应用 (Vite SPA)
│       └── .storybook/     # Storybook 10 配置（支持明暗主题实时切换）
├── packages/
│   └── ui/                 # 共享组件库 (@zev/ui)：shadcn/ui、Animate UI 图标/背景、Chart、Tracker 等
├── biome.json              # 全局代码规范配置
├── pnpm-workspace.yaml
└── package.json            # 根层级的依赖和统一脚本
```

## 🛠️ 快速开始

### 环境要求

- Node.js (建议 v20+)
- [pnpm](https://pnpm.io/) (项目包管理器)

### 1. 安装依赖

在 `zev-web` 根目录下执行：

```bash
pnpm install
```

### 2. 开发服务器

一键启动管理后台（`apps/admin`）的开发环境：

```bash
pnpm run dev
```

> 提示：本地开发服务器启动后，API 请求会默认代理到 `http://localhost:8080`（后端服务地址）。

### 3. 组件预览台 (Storybook)

无需启动后端即可独立预览与调试 `@zev/ui` 基础组件、Animate UI 图标/背景与 `ZevTable`：

```bash
pnpm run storybook
```

构建静态预览产物校验：

```bash
pnpm run build-storybook
```

### 4. 构建打包

进行生产环境的打包编译：

```bash
pnpm run build
```

## 📝 代码规范 (Biome & TypeScript)

本项目抛弃了传统的 ESLint 和 Prettier，全面拥抱 **Biome**，并与 `tsc -b` 联动校验：

- 检查并自动修复代码问题 + 类型检查:

  ```bash
  pnpm run lint
  ```
- 自动格式化代码 (Formatter):

  ```bash
  pnpm run format
  ```

> **推荐插件**：如果你使用 VS Code，推荐安装 `Biome` 或 `fronterior.biome-monorepo` 插件，并在保存时启用自动格式化功能。
