import { SidebarInset, SidebarProvider } from "@zev/ui/components/sidebar";
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
		<SidebarProvider>
			<Sidebar />
			<SidebarInset className="flex-1 flex flex-col min-h-screen bg-white">
				<Header />
				<Main />
			</SidebarInset>
		</SidebarProvider>
	);
}
