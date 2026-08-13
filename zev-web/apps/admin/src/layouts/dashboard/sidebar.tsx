import { useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import logoUrl from "@/assets/logo-animated.svg";
import { useUserStore } from "@/store";
import { useLayoutStore } from "@/store/layout";
import { buildNavItems, NavItem } from "./components/nav-item";

export function Sidebar() {
	const location = useLocation();
	const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed);
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
	const menus = useUserStore((state) => state.menus);

	const navItems = buildNavItems(menus);

	return (
		<motion.aside
			initial={false}
			animate={{ width: sidebarCollapsed ? 64 : 240 }}
			transition={{ type: "spring", stiffness: 400, damping: 40 }}
			className="bg-card border-r border-border flex flex-col z-20 shadow-sm relative overflow-hidden hidden md:flex"
		>
			<div className="h-16 px-4 flex items-center justify-center space-x-3 border-b border-border overflow-hidden shrink-0">
				<div className="flex aspect-square size-8 items-center justify-center shrink-0">
					<img src={logoUrl} alt="Logo" className="size-8" />
				</div>
				<AnimatePresence>
					{!sidebarCollapsed && (
						<motion.span
							initial={{ opacity: 0, width: 0 }}
							animate={{ opacity: 1, width: "auto" }}
							exit={{ opacity: 0, width: 0 }}
							className="text-base font-semibold truncate whitespace-nowrap"
						>
							Zev Admin
						</motion.span>
					)}
				</AnimatePresence>
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
				className="absolute bottom-0 left-0 right-0 h-12 border-t border-border flex items-center justify-center cursor-pointer hover:bg-muted text-muted-foreground transition-colors bg-card z-10 w-full"
				onClick={toggleSidebar}
			>
				{sidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
			</button>
		</motion.aside>
	);
}

export { MobileSidebar } from "./components/mobile-sidebar";
