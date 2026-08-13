import { Link } from "@tanstack/react-router";
import { cn } from "@zev/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/api/interface/system/user";
import { getMenuIcon } from "@/utils/menu-icons";

export type NavItemType = {
	name: string;
	path: string;
	icon: LucideIcon;
	children?: NavItemType[];
};

/**
 * 将后端菜单树转换为侧边栏导航项
 * 仅保留目录(M)和菜单(C)类型，过滤掉按钮(F)
 * 拼接父子路径生成完整路由
 */
export function buildNavItems(menus: MenuItem[], parentPath = ""): NavItemType[] {
	return menus
		.filter((m) => m.type === "M" || m.type === "C")
		.map((m) => {
			const fullPath = m.path.startsWith("/") ? m.path : `${parentPath}/${m.path}`.replace(/\/+/g, "/");

			const item: NavItemType = {
				name: m.name,
				path: fullPath,
				icon: getMenuIcon(m.icon),
			};

			if (m.children && m.children.length > 0) {
				item.children = buildNavItems(m.children, fullPath);
			}

			return item;
		});
}

export function NavItem({
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
						isChildActive ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "space-x-3")}>
						<item.icon
							className={cn(
								"h-[18px] w-[18px] shrink-0",
								isChildActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
							)}
						/>
						{!sidebarCollapsed && <span className="text-sm truncate relative z-10">{item.name}</span>}
					</div>
					{!sidebarCollapsed && (
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform relative z-10",
								isChildActive ? "text-primary" : "text-muted-foreground",
								expanded ? "rotate-180" : "",
							)}
						/>
					)}
				</button>
				<AnimatePresence initial={false}>
					{expanded && !sidebarCollapsed && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.2, ease: "easeInOut" }}
							className="pl-6 space-y-1 mt-1 overflow-hidden"
						>
							{item.children?.map((child) => (
								<NavItem
									key={child.path}
									item={child}
									activePath={activePath}
									sidebarCollapsed={sidebarCollapsed}
									toggleSidebar={toggleSidebar}
								/>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}

	const active = activePath === item.path;
	return (
		<Link
			to={item.path as never}
			title={sidebarCollapsed ? item.name : undefined}
			className={cn(
				"flex items-center px-3 py-2.5 rounded-md cursor-pointer transition-colors font-medium relative group",
				sidebarCollapsed ? "justify-center" : "space-x-3",
				active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
			)}
		>
			{active && (
				<motion.div
					layoutId="sidebar-active"
					className="absolute inset-0 bg-[var(--color-primary-light)] rounded-md"
					transition={{ type: "spring", stiffness: 400, damping: 30 }}
				/>
			)}
			<item.icon
				className={cn(
					"h-[18px] w-[18px] shrink-0 relative z-10",
					active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
				)}
			/>
			{!sidebarCollapsed && <span className="text-sm truncate relative z-10">{item.name}</span>}
		</Link>
	);
}
