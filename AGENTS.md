# AGENTS.md — ZEV Monorepo AI 开发入口

ZEV 是采用**极简黑白灰美学**的前后端分离后台系统：`zev-go`（Go 1.25 / Gin / GORM / PostgreSQL / Swagger）+ `zev-web`（pnpm workspace + React 19 + Vite 8 + Tailwind CSS v4 + TanStack Router/Query v5 + Biome + Storybook 10）。

## 常用命令

| 场景 | 命令 |
| :--- | :--- |
| 架构守卫自检（改动后必跑） | `node scripts/harness/cli.mjs check`（支持 `--json`） |
| 全量验证闭环（提交前必跑） | `node scripts/harness/cli.mjs verify` |
| 防熵增巡检（按需触发） | `node scripts/harness/cli.mjs entropy` |
| 长任务账本管理 | `node scripts/harness/cli.mjs plan <new\|list\|status\|archive>` |
| 后端测试 | `cd zev-go && go test ./...` |
| 前端校验与类型检查 | `cd zev-web && pnpm lint` |

## 不可逾越的架构铁律

1. **后端严格三层**：`controller/` 仅绑定参数并调用 `pkg/response` 返回，**禁止**引入 `gorm`、访问 `.DB` 或就地定义非 `*Controller` 结构体；依赖单向收敛（`controller -> service -> dto/entity`）。
2. **前端禁止硬刷新与原生弹窗**：严禁 `window.alert/confirm/prompt`（用 `@/hooks/use-confirm` 与 `sonner`）；登录/登出/401 必须走 [session.ts](zev-web/apps/admin/src/router/session.ts) 无刷新切换。
3. **UI 与组件库红线**：`pages/` 内严禁顶部正副标题；基于 Radix 的弹出层严禁传入 `forceMount`；锁定 Tailwind CSS v4（禁止 `tailwind.config.*` 与 `shadcn add chart`）。
4. **多语言与类型安全**：禁止 `any`；`zh-CN.ts` 与 `en-US.ts` 通过 `LocaleSchema` 强对齐。
5. **前后端路由同步**：[seed.json](zev-go/modules/system/seed/seed.json) 中的页面组件必须在 [components.tsx](zev-web/apps/admin/src/router/components.tsx) 注册。

## 按需查阅文档导航

| 文档 | 何时阅读 |
| :--- | :--- |
| [开发规范细则](.agents/rules/code.md) | 需要了解完整编码风格、Animate UI、ZevTable 与后端 `pkg/` 用法时 |
| [系统架构与 Harness 守卫手册](docs/architecture/system-map.md) | 理解模块注册、动态路由链路、9 条守卫规则与豁免语法时 |
| [Agent 子系统架构蓝图](docs/architecture/agent-module-blueprint.md) | 规划或实施 ZEV 业务侧 Agent Harness 模块时 |
| [长任务账本模板](docs/exec-plans/TEMPLATE.md) | 跨会话大型需求需要持久化进度与交接状态时 |

## 标准作业闭环

1. **接手上下文**：跨会话大任务先运行 `node scripts/harness/cli.mjs plan status` 查看 [active/](docs/exec-plans/active/.gitkeep) 目录。
2. **小步修改与自检**：每完成一个功能块运行 `node scripts/harness/cli.mjs check`，按 `remediation` 提示修复违规。
3. **收尾验收**：提交前运行 `node scripts/harness/cli.mjs verify`，确认全部测试与类型检查通过。
