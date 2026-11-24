import { type ComponentType, lazy, Suspense } from "react";
import { useI18n } from "@/i18n";

/**
 * 页面加载占位组件
 */
function PageLoading() {
	const { t } = useI18n();

	return (
		<div className="flex h-full min-h-[400px] items-center justify-center">
			<div className="flex flex-col items-center gap-3">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="text-sm text-muted-foreground">{t("common.pageLoading")}</span>
			</div>
		</div>
	);
}

/**
 * 用 Suspense 包裹 lazy 组件，提供统一的加载占位
 */
function withSuspense(Component: ComponentType): ComponentType {
	function Wrapped(props: Record<string, unknown>) {
		return (
			<Suspense fallback={<PageLoading />}>
				<Component {...props} />
			</Suspense>
		);
	}
	return Wrapped;
}

// --- Lazy 加载所有页面组件 ---
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const UserManagement = lazy(() => import("@/pages/system/user"));
const RoleManagement = lazy(() => import("@/pages/system/role"));
const MenuManagement = lazy(() => import("@/pages/system/menu"));
const DeptManagement = lazy(() => import("@/pages/system/dept"));
const DictManagement = lazy(() => import("@/pages/system/dict"));
const NoticeManagement = lazy(() => import("@/pages/system/notice"));
const OperLogManagement = lazy(() => import("@/pages/system/log/oper"));
const LoginLogManagement = lazy(() => import("@/pages/system/log/login"));
const MessagesCenter = lazy(() => import("@/pages/messages"));
const Profile = lazy(() => import("@/pages/profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * 后端菜单 component 字段 → 前端 React 组件的映射表
 *
 * 后端 seed.json 中的 component 值需要在此注册才能正确渲染。
 * 新增页面时只需在此处添加映射，无需修改路由代码。
 */
export const componentMap: Record<string, ComponentType> = {
	"dashboard/index": withSuspense(Dashboard),
	"system/user/index": withSuspense(UserManagement),
	"system/role/index": withSuspense(RoleManagement),
	"system/menu/index": withSuspense(MenuManagement),
	"system/dept/index": withSuspense(DeptManagement),
	"system/dict/index": withSuspense(DictManagement),
	"system/notice/index": withSuspense(NoticeManagement),
	"system/log/oper/index": withSuspense(OperLogManagement),
	"system/log/login/index": withSuspense(LoginLogManagement),
	"messages/index": withSuspense(MessagesCenter),
	"profile/index": withSuspense(Profile),
};

/**
 * 404 兜底组件
 */
export const NotFoundComponent = withSuspense(NotFound);
