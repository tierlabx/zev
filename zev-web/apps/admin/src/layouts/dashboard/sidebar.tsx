import { cn } from "@zev/ui/lib/utils";
import { Home, LayoutDashboard, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
	{ name: "Dashboard", path: "/dashboard", icon: Home },
	{ name: "User Management", path: "/users", icon: Users },
];

export function Sidebar() {
	const location = useLocation();

	return (
		<aside className="w-[240px] bg-white border-r border-[#E5E5E5] flex flex-col">
			<div className="h-16 px-6 flex items-center space-x-3 border-b border-[#E5E5E5]">
				<LayoutDashboard className="h-5 w-5" />
				<span className="text-base font-semibold">Zev Admin</span>
			</div>
			<nav className="flex-1 p-6 space-y-1">
				{navItems.map((item) => {
					const Icon = item.icon;
					const active = location.pathname.startsWith(item.path);
					return (
						<Link
							key={item.path}
							to={item.path}
							className={cn(
								"flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors font-medium",
								active ? "bg-[#F5F5F5] text-black" : "text-[#666666] hover:bg-[#F5F5F5]",
							)}
						>
							<Icon className="h-[18px] w-[18px]" />
							<span className="text-sm">{item.name}</span>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
