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
			{ path: "dashboard", element: <Dashboard /> },
			{ path: "users", element: <UserManagement /> },
		],
	},
	{
		path: "*",
		element: <Navigate to="/dashboard" replace />,
	},
];
