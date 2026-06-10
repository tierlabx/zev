import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@zev/ui/lib/utils";
import {
	Book,
	ChevronDown,
	ChevronsLeft,
	ChevronsRight,
	Home,
	Menu as MenuIcon,
	Settings,
	Shield,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import logoUrl from "@/assets/logo-animated.svg";
import { useLayoutStore } from "@/store/layout";

type NavItemType = {
	name: string;
	path: string;
	icon: React.ElementType;
	children?: NavItemType[];
};

const navItems: NavItemType[] = [
	{ name: "仪表盘", path: "/dashboard", icon: Home },
	{
		name: "系统管理",
		path: "/system",
		icon: Settings,
		children: [
			{ name: "用户管理", path: "/system/users", icon: Users },
			{ name: "角色管理", path: "/system/roles", icon: Shield },
			{ name: "菜单管理", path: "/system/menus", icon: MenuIcon },
			{ name: "字典管理", path: "/system/dicts", icon: Book },
		],
	},
];

function NavItem({
	item,
	activePath,
	sidebarCollapsed,
	toggleSidebar,
}: {
	item: NavItemType;
	activePath: string;
	sidebarCollapsed: boolean;
	toggleSidebar: () => void;
}) {
	const hasChildren = item.children && item.children.length > 0;

	// A parent is active if any of its children match the current route path
	const isChildActive = hasChildren && item.children?.some((child) => activePath.startsWith(child.path));
	const [expanded, setExpanded] = useState(isChildActive);

	useEffect(() => {
		if (isChildActive && !sidebarCollapsed) {
			setExpanded(true);
		}
	}, [isChildActive, sidebarCollapsed]);

	if (hasChildren) {
		return (
			<div className="space-y-1">
				<button
					type="button"
					onClick={() => {
						if (sidebarCollapsed) {
							toggleSidebar();
							setExpanded(true);
						} else {
							setExpanded(!expanded);
						}
					}}
					title={sidebarCollapsed ? item.name : undefined}
					className={cn(
						"w-full flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors font-medium relative group",
						sidebarCollapsed ? "justify-center" : "",
						isChildActive ? "text-[#1677FF]" : "text-[#666666] hover:bg-[#F5F5F5] hover:text-black",
					)}
				>
					<div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "space-x-3")}>
						<item.icon
							className={cn(
								"h-[18px] w-[18px] shrink-0",
								isChildActive ? "text-[#1677FF]" : "text-[#666666] group-hover:text-black",
							)}
						/>
						{!sidebarCollapsed && <span className="text-sm truncate">{item.name}</span>}
					</div>
					{!sidebarCollapsed && (
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform",
								isChildActive ? "text-[#1677FF]" : "text-[#666666]",
								expanded ? "rotate-180" : "",
							)}
						/>
					)}
				</button>
				{expanded && !sidebarCollapsed && (
					<div className="pl-6 space-y-1 mt-1">
						{item.children?.map((child) => (
							<NavItem
								key={child.path}
								item={child}
								activePath={activePath}
								sidebarCollapsed={sidebarCollapsed}
								toggleSidebar={toggleSidebar}
							/>
						))}
					</div>
				)}
			</div>
		);
	}

	const active = activePath === item.path;
	return (
		<Link
			to={item.path}
			title={sidebarCollapsed ? item.name : undefined}
			className={cn(
				"flex items-center px-3 py-2.5 rounded-md cursor-pointer transition-colors font-medium relative group",
				sidebarCollapsed ? "justify-center" : "space-x-3",
				active ? "bg-[#E6F4FF] text-[#1677FF]" : "text-[#666666] hover:bg-[#F5F5F5] hover:text-black",
			)}
		>
			<item.icon
				className={cn(
					"h-[18px] w-[18px] shrink-0",
					active ? "text-[#1677FF]" : "text-[#666666] group-hover:text-black",
				)}
			/>
			{!sidebarCollapsed && <span className="text-sm truncate">{item.name}</span>}
		</Link>
	);
}

export function Sidebar() {
	const location = useLocation();
	const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed);
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

	return (
		<aside
			className={cn(
				"bg-white border-r border-[#E5E5E5] flex flex-col z-20 transition-all duration-300 shadow-sm relative",
				sidebarCollapsed ? "w-[64px]" : "w-[240px]",
			)}
		>
			<div className="h-16 px-4 flex items-center justify-center space-x-3 border-b border-[#E5E5E5] overflow-hidden">
				<div className="flex aspect-square size-8 items-center justify-center shrink-0">
					<img src={logoUrl} alt="Logo" className="size-8" />
				</div>
				{!sidebarCollapsed && (
					<span className="text-base font-semibold truncate transition-opacity duration-300">GoWind Admin</span>
				)}
			</div>
			<nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden mb-12">
				{navItems.map((item) => (
					<NavItem
						key={item.path}
						item={item}
						activePath={location.pathname}
						sidebarCollapsed={sidebarCollapsed}
						toggleSidebar={toggleSidebar}
					/>
				))}
			</nav>
			<button
				type="button"
				className="absolute bottom-0 left-0 right-0 h-12 border-t border-[#E5E5E5] flex items-center justify-center cursor-pointer hover:bg-[#F5F5F5] text-muted-foreground transition-colors bg-white z-10 w-full"
				onClick={toggleSidebar}
			>
				{sidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
			</button>
		</aside>
	);
}
