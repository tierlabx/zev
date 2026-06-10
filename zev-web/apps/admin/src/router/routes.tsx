import { createRootRoute, createRoute, Outlet, redirect } from "@tanstack/react-router";
import App from "@/App";
import DashboardLayout from "@/layouts/dashboard";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import MenuManagement from "@/pages/system/menu";
import UserManagement from "@/pages/system/user";

export const rootRoute = createRootRoute({
	component: () => (
		<App>
			<Outlet />
		</App>
	),
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: Login,
});

const layoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "_layout",
	component: DashboardLayout,
});

const indexRoute = createRoute({
	getParentRoute: () => layoutRoute,
	path: "/",
	beforeLoad: () => {
		throw redirect({ to: "/dashboard" });
	},
});

const dashboardRoute = createRoute({
	getParentRoute: () => layoutRoute,
	path: "/dashboard",
	component: Dashboard,
	staticData: { title: "仪表盘" },
});

const systemRoute = createRoute({
	getParentRoute: () => layoutRoute,
	path: "/system",
	staticData: { title: "系统管理" },
});

const systemIndexRoute = createRoute({
	getParentRoute: () => systemRoute,
	path: "/",
	beforeLoad: () => {
		throw redirect({ to: "/system/users" });
	},
});

const usersRoute = createRoute({
	getParentRoute: () => systemRoute,
	path: "/users",
	component: UserManagement,
	staticData: { title: "用户管理" },
});

const menusRoute = createRoute({
	getParentRoute: () => systemRoute,
	path: "/menus",
	component: MenuManagement,
	staticData: { title: "菜单管理" },
});

const splatRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "$",
	beforeLoad: () => {
		throw redirect({ to: "/dashboard" });
	},
});

export const routeTree = rootRoute.addChildren([
	loginRoute,
	layoutRoute.addChildren([
		indexRoute,
		dashboardRoute,
		systemRoute.addChildren([systemIndexRoute, usersRoute, menusRoute]),
	]),
	splatRoute,
]);
