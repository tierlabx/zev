import { Navigate } from "@tanstack/react-router";
import { useUserStore } from "@/store";
import { Header } from "./header";
import { Main } from "./main";
import { Sidebar } from "./sidebar";
import { TagsView } from "./tags-view";

export default function DashboardLayout() {
	const token = useUserStore((state) => state.token);

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="flex h-screen w-full overflow-hidden bg-white">
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0 bg-[#F0F2F5]">
				<Header />
				<TagsView />
				<Main />
			</div>
		</div>
	);
}
