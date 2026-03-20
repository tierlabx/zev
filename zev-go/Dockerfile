# Base stage for Go
FROM golang:1.22-alpine AS base
WORKDIR /app
# 必须安装 git 用于下载依赖
RUN apk add --no-cache git tzdata

# Dev stage for hot reloading
FROM base AS dev
RUN go install github.com/air-verse/air@latest
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
# 使用 air 进行热更新
CMD ["air", "-c", ".air.toml"]

# Build stage
FROM base AS builder
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./main.go

# Production stage
FROM alpine:latest AS prod
WORKDIR /app
COPY --from=builder /app/main .
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=Asia/Shanghai
EXPOSE 8080
CMD ["./main"]
