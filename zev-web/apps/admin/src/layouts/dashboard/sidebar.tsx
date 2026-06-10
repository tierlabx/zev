import { cn } from "@zev/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { RouteObject } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import logoUrl from "@/assets/logo-animated.svg";
import { routes } from "@/router/routes";
import { useLayoutStore } from "@/store/layout";

type NavItemType = {
	name: string;
	path: string;
	icon: React.ElementType;
	children?: NavItemType[];
};

function parseRoutes(routeList: RouteObject[], basePath = ""): NavItemType[] {
	return routeList
		.map((route) => {
			const handle = route.handle as { title?: string; icon?: React.ElementType } | undefined;
			if (!handle?.title || !handle?.icon) return null;

			let fullPath = route.path || "";
			if (!fullPath.startsWith("/")) {
				fullPath = `${basePath}/${route.path}`.replace(/\/+/g, "/");
			}

			const children = route.children ? parseRoutes(route.children, fullPath) : undefined;

			return {
				name: handle.title,
				path: fullPath,
				icon: handle.icon,
				children: children && children.length > 0 ? children : undefined,
			};
		})
		.filter(Boolean) as NavItemType[];
}

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
						isChildActive ? "bg-black/5 text-black" : "text-[#666666] hover:bg-black/5 hover:text-black",
					)}
				>
					<div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "space-x-3")}>
						<item.icon
							className={cn(
								"h-[18px] w-[18px] shrink-0",
								isChildActive ? "text-black" : "text-[#666666] group-hover:text-black",
							)}
						/>
						{!sidebarCollapsed && <span className="text-sm truncate">{item.name}</span>}
					</div>
					{!sidebarCollapsed && (
						<ChevronDown className={cn("h-4 w-4 transition-transform text-[#666666]", expanded ? "rotate-180" : "")} />
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
				active ? "bg-black/5 text-black" : "text-[#666666] hover:bg-black/5 hover:text-black",
			)}
		>
			<item.icon
				className={cn("h-[18px] w-[18px] shrink-0", active ? "text-black" : "text-[#666666] group-hover:text-black")}
			/>
			{!sidebarCollapsed && <span className="text-sm truncate">{item.name}</span>}
			{active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-black rounded-r-md" />}
		</Link>
	);
}

export function Sidebar() {
	const location = useLocation();
	const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed);
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

	const dashboardRoute = routes.find((r) => r.path === "/");
	const navItems = parseRoutes(dashboardRoute?.children || [], "");

	return (
		<aside
			className={cn(
				"bg-white border-r border-[#E5E5E5] flex flex-col z-20 transition-all duration-300",
				sidebarCollapsed ? "w-[64px]" : "w-[240px]",
			)}
		>
			<div className="h-16 px-4 flex items-center justify-center space-x-3 border-b border-[#E5E5E5] overflow-hidden">
				<div className="flex aspect-square size-8 items-center justify-center shrink-0">
					<img src={logoUrl} alt="Logo" className="size-8" />
				</div>
				{!sidebarCollapsed && (
					<span className="text-base font-semibold truncate transition-opacity duration-300">Zev Admin</span>
				)}
			</div>
			<nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
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
		</aside>
	);
}
