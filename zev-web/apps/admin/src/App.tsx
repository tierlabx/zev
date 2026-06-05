import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Dashboard from "./pages/Dashboard";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";

function App() {
	return (
		<MotionConfig reducedMotion="user">
			<BrowserRouter>
				<Toaster position="top-center" />
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/" element={<Layout />}>
						<Route index element={<Navigate to="/dashboard" replace />} />
						<Route path="dashboard" element={<Dashboard />} />
						<Route path="users" element={<UserManagement />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</MotionConfig>
	);
}

export default App;
