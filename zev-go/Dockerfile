# syntax=docker/dockerfile:1

# Base stage for Go
FROM golang:1.25-alpine AS base
WORKDIR /app

ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=${GOPROXY}

# 安装 git（用于拉取依赖与 swag）、CA 证书与时区数据
RUN apk add --no-cache git ca-certificates tzdata

# Dev stage for hot reloading
FROM base AS dev
# 锁定兼容 Go 1.25 的最新版 air（v1.65+ 要求 Go 1.26+）
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go install github.com/air-verse/air@v1.64.5
COPY go.mod go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
EXPOSE 8080
# 使用容器专用 .air.docker.toml 隔离宿主机与容器的编译产物
CMD ["air", "-c", ".air.docker.toml"]

# Build stage
FROM base AS builder
COPY go.mod go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /app/zev-server ./main.go

# Production stage
FROM alpine:3.21 AS prod
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S zev \
    && adduser -S zev -G zev
WORKDIR /app

COPY --from=builder /app/zev-server ./zev-server
# 复制初始化种子文件，确保生产空库首次启动能自动初始化管理员与菜单
COPY --from=builder /app/modules/system/seed/seed.json ./modules/system/seed/seed.json
RUN mkdir -p /app/logs && chown -R zev:zev /app

USER zev
ENV GIN_MODE=release \
    TZ=Asia/Shanghai \
    APP_PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${APP_PORT}/api/ping || exit 1

CMD ["./zev-server"]
