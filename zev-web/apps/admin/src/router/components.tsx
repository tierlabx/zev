import { lazyRouteComponent, type RouteComponent } from "@tanstack/react-router";

// --- 使用 TanStack Router 原生 lazyRouteComponent，支持 .preload() 并在分包加载完成前不挂载空白占位 ---
const Dashboard = lazyRouteComponent(() => import("@/pages/Dashboard"));
const UserManagement = lazyRouteComponent(() => import("@/pages/system/user"));
const RoleManagement = lazyRouteComponent(() => import("@/pages/system/role"));
const MenuManagement = lazyRouteComponent(() => import("@/pages/system/menu"));
const DeptManagement = lazyRouteComponent(() => import("@/pages/system/dept"));
const DictManagement = lazyRouteComponent(() => import("@/pages/system/dict"));
const NoticeManagement = lazyRouteComponent(() => import("@/pages/system/notice"));
const LogManagement = lazyRouteComponent(() => import("@/pages/system/log"));
const MessagesCenter = lazyRouteComponent(() => import("@/pages/messages"));
const Profile = lazyRouteComponent(() => import("@/pages/profile"));
const AgentProvider = lazyRouteComponent(() => import("@/pages/agent/provider"));
const AgentWorkspace = lazyRouteComponent(() => import("@/pages/agent/workspace"));
const AgentPlayground = lazyRouteComponent(() => import("@/pages/agent/playground"));
const AgentTraces = lazyRouteComponent(() => import("@/pages/agent/traces"));
const AgentEvals = lazyRouteComponent(() => import("@/pages/agent/evals"));
const AiChat = lazyRouteComponent(() => import("@/pages/ai-chat"));
const Forbidden = lazyRouteComponent(() => import("@/pages/Forbidden"));
const NotFound = lazyRouteComponent(() => import("@/pages/NotFound"));

/**
 * 后端菜单 component 字段 → 前端 React 组件的映射表
 *
 * 后端 seed.json 中的 component 值需要在此注册才能正确渲染。
 * 新增页面时只需在此处添加映射，无需修改路由代码。
 */
export const componentMap: Record<string, RouteComponent> = {
	"dashboard/index": Dashboard,
	"system/user/index": UserManagement,
	"system/role/index": RoleManagement,
	"system/menu/index": MenuManagement,
	"system/dept/index": DeptManagement,
	"system/dict/index": DictManagement,
	"system/notice/index": NoticeManagement,
	"system/log/index": LogManagement,
	"messages/index": MessagesCenter,
	"profile/index": Profile,
	"agent/provider/index": AgentProvider,
	"agent/workspace/index": AgentWorkspace,
	"agent/playground/index": AgentPlayground,
	"agent/traces/index": AgentTraces,
	"agent/evals/index": AgentEvals,
	"ai-chat/index": AiChat,
};

/**
 * 已注册的前端页面组件路径清单（供菜单组件选择器点选）
 */
export const REGISTERED_COMPONENT_PATHS: readonly string[] = Object.keys(componentMap);

/**
 * 403 无权限兜底组件（独立导出，不进入 componentMap 以保持 seed.json 映射纯粹）
 */
export const ForbiddenComponent: RouteComponent = Forbidden;

/**
 * 404 兜底组件
 */
export const NotFoundComponent: RouteComponent = NotFound;
