# Zev Web Frontend

Zev 项目的现代前端工程，采用 **pnpm workspace** 搭建的 Monorepo（单体仓库）架构。

## 🚀 技术栈

本项目采用了目前最前沿且高效的前端技术栈：

- **核心框架**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/) - 极速的开发服务器和打包工具
- **路由管理**: [React Router v7](https://reactrouter.com/)
- **状态管理**: [Zustand](https://zustand-demo.pmnd.rs/) - 轻量级且强大的状态管理库
- **样式与组件**:
  - [Tailwind CSS v4](https://tailwindcss.com/) - 实用优先的 CSS 框架
  - [shadcn/ui](https://ui.shadcn.com/) - 可定制的无头 UI 组件库
- **代码规范**: [Biome](https://biomejs.dev/) - 替代 Prettier + ESLint 的极速格式化与代码检查工具

## 📂 目录结构

基于 pnpm workspaces 划分：

```text
zev-web/
├── apps/
│   └── admin/        # 管理后台子应用 (Vite SPA)
├── packages/
│   └── ui/           # 共享的组件库 (@zev/ui)，主要存放基于 shadcn 提取的组件
├── biome.json        # 全局代码规范配置
├── pnpm-workspace.yaml
└── package.json      # 根层级的依赖和统一脚本
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

### 3. 构建打包

进行生产环境的打包编译：

```bash
pnpm run build
```

## 📝 代码规范 (Biome)

本项目抛弃了传统的 ESLint 和 Prettier，全面拥抱 **Biome**，它速度极快，并且开箱即用。

- 检查代码问题 (Linter):
  ```bash
  pnpm run lint
  ```
- 自动格式化代码 (Formatter):
  ```bash
  pnpm run format
  ```

> **推荐插件**：如果你使用 VS Code，推荐安装 `Biome` 或 `fronterior.biome-monorepo` 插件，并在保存时启用自动格式化功能。
