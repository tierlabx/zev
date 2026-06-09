import { Home, Users } from "lucide-react";
import { Navigate, type RouteObject } from "react-router-dom";
import DashboardLayout from "@/layouts/dashboard";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
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
				handle: { title: "Dashboard", icon: Home },
			},
			{
				path: "users",
				element: <UserManagement />,
				handle: { title: "User Management", icon: Users },
			},
		],
	},
	{
		path: "*",
		element: <Navigate to="/dashboard" replace />,
	},
];
