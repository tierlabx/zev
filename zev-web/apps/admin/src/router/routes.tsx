import { Home, Menu as MenuIcon, Settings, Users } from "lucide-react";
import { Navigate, type RouteObject } from "react-router-dom";
import DashboardLayout from "@/layouts/dashboard";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import MenuManagement from "@/pages/system/menu";
import UserManagement from "@/pages/system/user";

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
				path: "system",
				handle: {
					title: "系统管理",
					icon: Settings,
				},
				children: [
					{ index: true, element: <Navigate to="/system/users" replace /> },
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
		],
	},
	{
		path: "*",
		element: <Navigate to="/dashboard" replace />,
	},
];
