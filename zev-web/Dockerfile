# Base system
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Dependency resolution
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install

# Dev stage
FROM base AS dev
COPY --from=deps /app/node_modules /app/node_modules
# 为 workspace 内部的包链接做些准备
COPY . .
# React Vite 开发端口
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]

# Build stage
FROM base AS builder
COPY . .
RUN pnpm install
RUN pnpm build

# Prod stage (nginx)
FROM nginx:alpine AS prod
# 依据 admin 目录的构建产物进行托管
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
# React 路由兼容
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $$uri $$uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
