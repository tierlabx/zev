import { cn } from "@zev/ui/lib/utils";
import { Command, Home, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
	{ name: "Dashboard", path: "/dashboard", icon: Home },
	{ name: "User Management", path: "/users", icon: Users },
];

export function Sidebar() {
	const location = useLocation();

	return (
		<aside className="w-[240px] bg-white border-r border-[#E5E5E5] flex flex-col z-20">
			<div className="h-16 px-6 flex items-center space-x-3 border-b border-[#E5E5E5]">
				<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black text-white">
					<Command className="size-5" />
				</div>
				<span className="text-base font-semibold">Zev Admin</span>
			</div>
			<nav className="flex-1 p-4 space-y-1">
				{navItems.map((item) => {
					const Icon = item.icon;
					const active = location.pathname.startsWith(item.path);
					return (
						<Link
							key={item.path}
							to={item.path}
							className={cn(
								"flex items-center space-x-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors font-medium relative group",
								active ? "bg-black/5 text-black" : "text-[#666666] hover:bg-black/5 hover:text-black",
							)}
						>
							<Icon
								className={cn("h-[18px] w-[18px]", active ? "text-black" : "text-[#666666] group-hover:text-black")}
							/>
							<span className="text-sm">{item.name}</span>
							{active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-black rounded-r-md" />}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
