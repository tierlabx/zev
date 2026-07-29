# Zev 动态路由生成 — 改动概览

## 目标

将前端路由从硬编码静态定义改为从后端菜单数据自动生成，实现真正的动态路由——不同角色用户登录后只能访问其权限范围内的路由。

## 核心改动

### 1. 组件注册表 (`src/router/components.tsx`)

后端菜单 `component` 字段（如 `dashboard/index`、`system/user/index`）到前端 `React.lazy()` 组件的映射表。新增页面时只需在此注册，无需修改路由代码。

### 2. 动态路由生成器 (`src/router/routes.tsx`)

`buildRouteTree(menus)` 函数递归遍历后端菜单树，自动生成 TanStack Router 路由对象：

- **M 目录类型** → 创建父路由，递归添加子路由，自动生成 index 重定向
- **C 菜单类型** → 创建带 lazy 组件的路由，从 componentMap 解析
- **F 按钮类型** → 跳过，不生成路由（仅用于权限控制）

### 3. 路由器工厂 (`src/router/index.tsx`)

模块加载时从 zustand persist 同步读取持久化的菜单数据，调用 `buildRouteTree()` 构建完整路由树。

### 4. 认证流程更新

| 场景 | 旧方式 | 新方式 |
|------|--------|--------|
| 登录成功 | `navigate({ to: "/dashboard" })` | `window.location.href = firstPage` — 触发页面重建路由树 |
| 退出登录 | `navigate({ to: "/login" })` | `window.location.href = "/login"` — 触发页面重建路由树 |
| 401 响应 | `router.navigate({ to: "/login" })` | `window.location.href = "/login"` — 移除 router 依赖 |
| 页面刷新 | 静态路由 | 从 persist 读取 menus，动态构建路由树 |

### 5. 新增页面

- `src/pages/Profile.tsx` — 个人中心页面（展示用户信息 + 权限标识）
- `src/pages/NotFound.tsx` — 404 页面（动画入场 + 回到首页）

### 6. 辅助改动

- `src/lib/menu-utils.ts` — 共享的 `findFirstPagePath()` 工具函数
- `src/store/tags.ts` — 移除硬编码的初始 dashboard 标签
- `src/layouts/dashboard/tags-view.tsx` — 回退导航使用动态首页路径
- `src/layouts/dashboard/index.tsx` — 检测 menus 从空到有时自动 reload 重建路由
- `src/layouts/components/account-dropdown.tsx` — 个人中心导航到 `/profile`

## 编译验证

- ✅ `tsc -b --force` — TypeScript 类型检查通过
- ✅ `vite build` — 生产构建通过，代码分割正常（每页面独立 chunk）
- ✅ `go build ./...` — 后端编译通过

## 路由流程图

```
后端 /user/info → 返回按角色过滤的菜单树
        ↓
zustand store (persist → localStorage)
        ↓
router/index.tsx 模块加载时同步读取 menus
        ↓
buildRouteTree(menus) 递归生成路由树
  ├── loginRoute (固定)
  ├── layoutRoute → 动态子路由
  │   ├── /dashboard (C → Dashboard 组件)
  │   ├── /system (M → 目录, 无组件)
  │   │   ├── / (index → 重定向到 /system/user)
  │   │   ├── /user (C → UserManagement)
  │   │   ├── /role (C → RoleManagement)
  │   │   └── /menu (C → MenuManagement)
  │   ├── /profile (C → Profile)
  │   └── /404 (固定兜底)
  └── $ (splat → 重定向到第一个可用页面)
```

## 后续建议

1. **数据权限** — 在 Role 上增加 DataScope 字段实现行级数据隔离
2. **Redis 权限缓存** — RBAC 中间件每次请求查库，高并发场景应引入缓存
3. **Refresh Token** — 当前 JWT 过期后无刷新机制
4. **路由懒加载预取** — 在侧边栏 hover 时预加载对应 chunk
