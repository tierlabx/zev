import { Highlight } from "@animate-ui/react/primitives/effects/highlight";
import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { useLocation } from "@tanstack/react-router";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import logoUrl from "@/assets/logo-animated.svg";
import { useUserStore } from "@/store";
import { useLayoutStore } from "@/store/layout";
import { buildNavItems, NavItem } from "./components/nav-item";
import { SidebarFireworksBackground } from "./components/sidebar-fireworks-background";

export function Sidebar() {
	const location = useLocation();
	const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed);
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
	const menus = useUserStore((state) => state.menus);

	const navItems = buildNavItems(menus);
	const reduce = useShouldReduceMotion();
	const collapseTransition = useTempoTransition(reduce ? { duration: 0 } : motionTransition.collapse);
	const labelTransition = useTempoTransition(reduce ? { duration: 0 } : motionTransition.collapseLabel);

	return (
		<motion.aside
			initial={false}
			animate={{ width: sidebarCollapsed ? 64 : 240 }}
			transition={collapseTransition}
			className="bg-sidebar border-r border-border flex flex-col z-20 shadow-sm relative overflow-hidden hidden md:flex"
		>
			<SidebarFireworksBackground collapsed={sidebarCollapsed} />
			<div className="h-16 px-4 flex items-center justify-center space-x-3 border-b border-border overflow-hidden shrink-0 relative z-10 bg-sidebar/70 backdrop-blur-[1px]">
				<div className="flex aspect-square size-8 items-center justify-center shrink-0">
					<img src={logoUrl} alt="Logo" className="size-8" />
				</div>
				<AnimatePresence>
					{!sidebarCollapsed && (
						<motion.span
							initial={{ opacity: 0, width: 0 }}
							animate={{ opacity: 1, width: "auto" }}
							exit={{ opacity: 0, width: 0 }}
							transition={labelTransition}
							className="text-base font-semibold truncate whitespace-nowrap"
						>
							Zev Admin
						</motion.span>
					)}
				</AnimatePresence>
			</div>
			<nav className="relative z-10 flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden mb-12">
				<Highlight hover controlledItems exitDelay={100} className="inset-0 rounded-md bg-muted">
					{navItems.map((item) => (
						<NavItem
							key={item.path}
							item={item}
							activePath={location.pathname}
							sidebarCollapsed={sidebarCollapsed}
							toggleSidebar={toggleSidebar}
						/>
					))}
				</Highlight>
			</nav>
			<button
				type="button"
				className="absolute bottom-0 left-0 right-0 h-12 border-t border-border flex items-center justify-center cursor-pointer hover:bg-muted/80 text-muted-foreground transition-colors bg-sidebar/80 backdrop-blur-xs z-20 w-full"
				onClick={toggleSidebar}
			>
				{sidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
			</button>
		</motion.aside>
	);
}

export { MobileSidebar } from "./components/mobile-sidebar";
