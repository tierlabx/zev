# syntax=docker/dockerfile:1

# Base system
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG NPM_REGISTRY=
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi \
    && npm install -g pnpm@10.24.0 \
    && pnpm config set store-dir /pnpm/store \
    && if [ -n "$NPM_REGISTRY" ]; then pnpm config set registry "$NPM_REGISTRY"; fi
WORKDIR /app

# Dependency installation stage (shared by dev and builder)
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# Dev stage (Vite + Storybook)
FROM deps AS dev
COPY . .
# Vite 开发端口 (5173) 与 Storybook 组件预览端口 (6006)
EXPOSE 5173 6006
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Build stage
FROM deps AS builder
COPY . .
RUN pnpm build

# Prod stage (nginx)
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
