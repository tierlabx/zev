# ZEV 业务侧 Agent Harness 子系统 (`agent` 模块)

- **状态**: `completed`
- **创建日期**: 2026-11-26
- **关联模块**: `zev-go/modules/agent/` / `zev-web/apps/admin/src/pages/agent/`

## 1. 目标与非目标

### 目标
- 在 `zev-go/modules/agent/` 构建企业级可控、可观测、可审批、可评测的 AI Agent 运行时与管理后端，零侵入 `modules/system`。
- 纯 Go `engine/` 覆盖多模型网关适配（OpenAI 兼容 / Anthropic / Gemini / Ollama + 重试熔断）、ReAct Tool-Use 执行循环（步数/Token 预算熔断、Context 裁剪）、内置 RBAC/DataScope 只读工具 + MCP JSON-RPC 工具适配、输入/输出脱敏与高危工具审批护栏、确定性断言与 LLM-as-a-Judge 评测器。
- 复用 `middleware.AuthMiddleware` / `RequirePermission` / `DataScopeMiddleware` / `OperLogMiddleware` 与 `pkg/noticehub` 实时 SSE 审批提醒。
- 在 `zev-web/apps/admin/src/pages/agent/` 落地 5 大极简黑白灰界面：模型网关 (`provider`)、编排中心 (`workspace`)、SSE 调试台 (`playground`)、执行轨迹 (`traces`)、评测回归 (`evals`)。

### 非目标（Explicit Non-Goals）
- 不自研底层模型推理引擎或向量库内核。
- 不开放无沙箱限制的任意宿主机 Shell 执行工具。

## 2. 原子任务清单

- [x] 后端实体层（`provider` / `agent` / `run` / `run_span` / `approval` / `eval`）与加密工具（验收：`go vet ./...`）
- [x] 纯 Go 引擎 `engine/{crypto,provider,guardrail,tool,runtime,evaluator}` 及单元测试（验收：`go test ./modules/agent/engine/...`）
- [x] 后端 `dto` / `service`（含 RBAC+DataScope 内置工具与 `noticehub` 审批联动） / `controller`（含 SSE 流） / `init.go`（验收：`go test ./...` + `archcheck`）
- [x] 挂载模块至 `zev-go/main.go` 并在 `seed.json` 注册智能体中心菜单与 RBAC 权限（验收：`node scripts/harness/cli.mjs check`）
- [x] 前端 API/DTO/Interface、路由映射、菜单图标、中英文多语言与 `use-notice-stream` 审批跳转联动
- [x] 前端 5 大视图页面：`provider`、`workspace`、`playground`、`traces`、`evals`（验收：`pnpm lint` + `pnpm run typecheck` + `pnpm run build`）
- [x] 全量验证闭环（验收：`node scripts/harness/cli.mjs verify` + `entropy` 0 errors, 0 warns）

## 3. 关键决策与踩坑记录

- 2026-11-26: 采用 AES-256-GCM 基于配置密钥加密持久化模型供应商 API Key（release 模式强制要求显式密钥），接口仅返回脱敏摘要；高危工具通过内存 `ApprovalBroker`（支持预注册防先 Resolve 后 Wait 丢唤醒）+ 数据库 `agent_approvals` 原子更新 + `pkg/noticehub` 实时通知形成人机审批闭环。
- 2026-11-26: 将 `seed.json` 升级为按模块注册（`modules.RegisterSeed` + `modules/agent/seed/seed.json`），`modules/system/seed/seed.json` 保持零侵入，Harness `X-ROUTE-COMPONENT-SYNC` 自动扫描 `modules/*/seed/seed.json`。
- 2026-11-26: Anthropic 与 Gemini 升级为真 SSE 流式解析与思考过程透传（`reasoning` 事件），Anthropic 多条连续 `tool_result` 合并入单条 `user` 消息；MCP 客户端补齐 SSRF 防护、`initialize` 握手与 Streamable HTTP SSE 解析；Eval 回归改为后台异步执行 + 前端轮询进度；`AgentFormDialog.tsx` 拆分为多文件消除 `ENTROPY-HOTSPOTS`。
- 2026-11-26: 实体结构嵌入 `gorm.Model` 时使用 `ModelName` 映射列 `column:model` 避免字段名冲突；前端 `src/i18n/index.ts` 扩展 `DotPaths` 与寻址函数支持任意深度嵌套多语言键。

## 4. 最新验证证据

```text
node scripts/harness/cli.mjs verify  -> ALL VERIFY STAGES PASSED (0 errors, 0 pending)
  - archcheck (Go 架构守卫)         -> 0 violations
  - frontend & contract checks      -> 0 violations (X-ROUTE-COMPONENT-SYNC 扫描 modules/*/seed/seed.json 100% 同步)
  - go vet ./... & go test ./...    -> PASS (含 modules/system/seed 与 engine/{crypto,provider,guardrail,tool,runtime,evaluator} 全部单测)
  - pnpm lint & pnpm run typecheck  -> PASS (0 errors)
node scripts/harness/cli.mjs entropy -> 0 error, 0 warn, 0 agent drift/hotspots
pnpm --dir zev-web run build         -> PASS (Vite 8 生产构建成功)
```

## Session Handoff

- **当前进度**: M2.1 + M2.2 + M2.3 主干能力及工程加固（模块化 Seed、审批竞态修复、多模型真流式、MCP SSRF/SSE、Eval 异步化、Playground 增强、Swagger 同步）已全部交付并通过验证
- **下一步指令**: 启动数据库与前后端联调，在「智能体中心 -> 模型网关」配置真实 API Key/Ollama 并体验流式调试、高危工具审批、Trace 瀑布与异步评测回归
- **待确认风险**: 无
