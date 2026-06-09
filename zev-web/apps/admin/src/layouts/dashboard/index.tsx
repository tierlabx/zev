import { Navigate } from "react-router-dom";
import { useUserStore } from "@/store";
import { Header } from "./header";
import { Main } from "./main";
import { Sidebar } from "./sidebar";

export default function DashboardLayout() {
	const token = useUserStore((state) => state.token);

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="min-h-screen flex bg-white text-black text-sm">
			<Sidebar />
			<div className="flex-1 flex flex-col">
				<Header />
				<Main />
			</div>
		</div>
	);
}
