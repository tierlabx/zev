import { Home, Menu as MenuIcon, Users } from "lucide-react";
import { Navigate, type RouteObject } from "react-router-dom";
import DashboardLayout from "@/layouts/dashboard";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import MenuManagement from "@/pages/MenuManagement";
import UserManagement from "@/pages/UserManagement";

export const routes: RouteObject[] = [
	{
		path: "/login",
		element: <Login />,
	},
	{
		path: "/",
		element: <DashboardLayout />,
		children: [
			{ index: true, element: <Navigate to="/dashboard" replace /> },
			{
				path: "dashboard",
				element: <Dashboard />,
				handle: { title: "仪表盘", icon: Home },
			},
			{
				path: "users",
				element: <UserManagement />,
				handle: { title: "用户管理", icon: Users },
			},
			{
				path: "menus",
				element: <MenuManagement />,
				handle: { title: "菜单管理", icon: MenuIcon },
			},
		],
	},
	{
		path: "*",
		element: <Navigate to="/dashboard" replace />,
	},
];
