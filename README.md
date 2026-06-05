# Zev

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
| **前端框架** | React 19, TypeScript, Vite, React Router v7, Zustand |
| **前端 UI** | Tailwind CSS v4, shadcn/ui, animate-ui, React Hook Form, Zod |
| **代码规范** | Biome (前端代码格式化与检查) |
| **部署与运行** | Docker, Docker Compose |

## 🛠️ 快速开始 (使用 Docker Compose)

本项目在根目录提供了 `docker-compose.yml`，用于一键启动完整的全栈开发环境（包含数据库、后端服务、前端开发服务器）。

### 1. 前提条件
请确保本地已安装 [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/)。

### 2. 启动完整环境
在项目根目录下执行以下命令：

```bash
docker-compose up -d
```

### 3. 访问服务
容器启动完成后，你可以通过以下地址访问各服务：
- **前端页面** (开发环境): [http://localhost:5173](http://localhost:5173)
- **后端 API 服务**: [http://localhost:8080](http://localhost:8080)
- **Swagger 接口文档**: [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)
- **PostgreSQL 数据库**: 端口映射在 `5432`，用户/库名均默认配置在 `docker-compose.yml` 中。

> **注意**：如果希望在宿主机本地（而非 Docker 容器内）进行独立开发，请分别进入 `zev-go` 和 `zev-web` 目录，按照各自 `README.md` 提供的本地开发指南启动服务。
