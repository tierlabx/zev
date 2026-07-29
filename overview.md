# RBAC 权限系统完善 + 前端优化

## 完成内容

### 后端 (zev-go) — RBAC 权限系统完善

| 改动项 | 文件 | 说明 |
|--------|------|------|
| User 实体增强 | `entity/user.go` | 新增 Status/Email/Avatar 字段 |
| JWT 配置化 | `config/config.go`, `jwtx/jwt.go` | 密钥/过期时间从环境变量读取 |
| **新增 /user/info 接口** | `controller/user.go`, `init.go` | 返回用户信息+权限+菜单树 |
| 按角色过滤菜单树 | `service/menu.go` | `GetMenuTreeByRole()` 方法 |
| 获取角色权限标识 | `service/role.go` | `GetRolePerms()` 方法，admin 返回 `["*"]` |
| 登录状态检查 | `service/user.go` | 禁用账号无法登录 |
| Bug 修复 | `dto/role.go` | AssignRoleMenusReq JSON tag 修正 |
| Seed 数据增强 | `seed/seed.json` | 16 个按钮级权限 + 仪表盘/个人中心菜单 |
| main.go 初始化 | `main.go` | 启动时调用 `jwtx.Init()` |

### 前端 (zev-web) — 优化与权限集成

| 改动项 | 文件 | 说明 |
|--------|------|------|
| **路由守卫** | `router/routes.tsx` | beforeLoad 检查 token |
| **Store 扩展** | `store/index.ts` | 存储 userInfo/permissions/menus + hasPermission() |
| **权限 Hook** | `hooks/use-permission.ts` | hasPermission / hasAnyPermission / hasAllPermissions |
| **动态侧边栏** | `layouts/dashboard/sidebar.tsx` | 从 Store 菜单数据动态渲染 |
| 图标映射 | `lib/menu-icons.ts` | 后端 icon 字段 → lucide-react 组件 |
| 刷新自动获取 | `layouts/dashboard/index.tsx` | 有 token 无 userInfo 时自动 fetch |
| 登录后获取信息 | `pages/Login.tsx` | 登录成功调用 /user/info |
| 用户下拉菜单 | `layouts/components/account-dropdown.tsx` | 显示真实用户信息 |
| 用户管理权限控制 | `pages/system/user/index.tsx` | 按钮根据权限条件渲染 |
| 用户表单增强 | `pages/system/user/components/UserFormDialog.tsx` | 新增邮箱/状态字段 |
| API 修复 | `api/system/role.ts` | assignRoleMenus 字段名修正 |
| API 增强 | `api/system/auth.ts` | 新增 getUserInfoApi() |
| 类型定义 | `api/interface/system/user.ts` | 新增 UserInfo/MenuItem 类型 |
| TS 修复 | `components/zev-table/checkbox.tsx` | CheckboxProps 类型冲突 |

### RBAC 权限流转架构

```
用户登录 → /system/login → 返回 JWT Token
                ↓
        前端存储 Token
                ↓
        调用 /system/user/info
                ↓
    返回 { userInfo, permissions[], menus[] }
                ↓
    ┌───────────────────────────────────┐
    │  permissions → usePermission Hook │ → 按钮级权限控制
    │  menus[]     → 动态侧边栏渲染      │ → 菜单级权限控制
    │  userInfo    → Header 用户展示     │ → 用户信息显示
    └───────────────────────────────────┘
                ↓
    API 请求 → AuthMiddleware → RequirePermission → 业务处理
    (JWT 解析 userID/roleID)  (查 sys_role_menus 表)
```

### 编译验证

- ✅ Go 后端编译通过 (`go build ./...`)
- ✅ TypeScript 类型检查通过 (`tsc -b --force`)
- ✅ Vite 生产构建通过 (`vite build`)

### 后续建议

1. **动态路由**: 目前路由仍为静态定义，可进一步改为从后端菜单数据动态生成路由
2. **权限缓存**: RBAC 中间件每次请求查库，可引入 Redis 缓存角色权限
3. **Refresh Token**: 当前 JWT 24h 过期无刷新机制，可增加 refresh token
4. **操作日志**: 增加 API 操作审计日志中间件
5. **数据权限**: 在 Role 上增加 DataScope 字段实现数据级别权限控制
