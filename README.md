

# Zev

<p align="center">
    <img src="./images/logo-animated.svg" alt="Zev Logo" width="100" height="100" />
</p>

发音 `/zev/` 顺口。

希伯来本源：**狼**，寓意果敢沉稳、靠谱有担当。



Zev 是一个现代化的前后端分离项目，采用 Go 语言作为强大的后端支撑，React 19 作为灵活的前端展现。

## 📁 项目结构

项目采用多包分离的结构，主要分为前后端两个子项目：

- [**zev-go**](./zev-go/): 后端服务。基于 Gin + GORM 的现代化 Go 后端。
- [**zev-web**](./zev-web/): 前端工程。基于 Vite + React 19 + pnpm workspaces 搭建的 Monorepo 架构。

*(进入上述子目录可查看更详细的 `README.md`)*

## 🚀 技术栈全览

| 领域 | 核心技术选型 |
| --- | --- |
| **后端** | Go, Gin, GORM, PostgreSQL, Swaggo, Air |
| **前端框架** | React 19, TypeScript, Vite 8, TanStack Router, TanStack Query, Zustand |
| **前端 UI** | Tailwind CSS v4, shadcn/ui, animate-ui, Recharts, cmdk, Sonner, React Hook Form, Zod |
| **代码规范与预览** | Biome (格式化与 Lint 检查), Storybook 10 (组件预览工作台) |
| **部署与运行** | Docker, Docker Compose |

## 🛠️ 快速开始 (使用 Docker Compose)

本项目提供 **开发模式 (`dev`)** 与 **生产模式 (`prod`)** 两套 Docker Compose 编排方案，基于根路径 `docker-compose.yml` 底座自动组合。

### 1. 前提条件
请确保本地已安装 [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/)。如需自定义端口、密钥或国内镜像加速（`GOPROXY` / `NPM_REGISTRY`），可先复制环境变量模板：

```bash
cp .env.example .env
```

### 2. 开发模式 (dev)
直接运行默认命令即可自动加载 `docker-compose.yml` 与 `docker-compose.override.yml`，启动包含热重载前后端、PostgreSQL 与 Storybook 组件工作台在内的完整开发环境：

```bash
docker compose up -d
```

容器启动完成后，可通过以下地址访问各服务：
- **前端页面 (Vite HMR)**: [http://localhost:5173](http://localhost:5173)
- **Storybook 组件预览台**: [http://localhost:6006](http://localhost:6006)
- **后端 API 服务 (Air 热重载)**: [http://localhost:8080](http://localhost:8080)
- **Swagger 接口文档**: [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)
- **PostgreSQL 数据库**: 端口映射在 `5432`（用户/库名详见 `.env.example`）。

> **提示**：当在宿主机对 `zev-web` 增删 npm 依赖后，请执行 `docker compose up -d --build --renew-anon-volumes frontend storybook` 以刷新容器内的 `node_modules` 匿名卷。

### 3. 生产模式 (prod)
生产环境请务必先复制 `.env.example` 为 `.env` 并修改 `DB_PASSWORD` 与 `JWT_SECRET`，然后显式指定 `docker-compose.prod.yml` 启动：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

生产模式特性与访问方式：
- **统一入口 (Nginx)**: [http://localhost:80](http://localhost:80)（端口可通过 `.env` 中 `WEB_PORT` 调整）
- **内置反向代理**: Nginx 托管前端构建产物，并将 `/api/` 与 `/api/system/notice/stream`（SSE 长连接）代理至内部 `backend:8080`
- **网络隔离与安全**: 不启动 Storybook，不挂载宿主机源码，PostgreSQL (`5432`) 与 Go 后端 (`8080`) 仅在内部网络互通，默认关闭 Swagger 文档暴露（可通过 `ENABLE_SWAGGER=true` 按需开启）。

> **注意**：如果希望在宿主机本地（而非 Docker 容器内）进行独立开发，请分别进入 `zev-go` 和 `zev-web` 目录，按照各自 `README.md` 提供的本地开发指南启动服务。
