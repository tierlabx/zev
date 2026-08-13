import { useLocation } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTrigger } from "@zev/ui/components/sheet";
import logoUrl from "@/assets/logo-animated.svg";
import { useUserStore } from "@/store";
import { buildNavItems, NavItem } from "./nav-item";

export function MobileSidebar({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const menus = useUserStore((state) => state.menus);
	const navItems = buildNavItems(menus);
	const toggleSidebar = () => {}; // Dummy toggle for mobile

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent side="left" className="w-[240px] p-0 bg-card border-r-border">
				<div className="flex flex-col h-full">
					<div className="h-16 px-4 flex items-center justify-center space-x-3 border-b border-border overflow-hidden shrink-0">
						<div className="flex aspect-square size-8 items-center justify-center shrink-0">
							<img src={logoUrl} alt="Logo" className="size-8" />
						</div>
						<span className="text-base font-semibold truncate whitespace-nowrap text-foreground">Zev Admin</span>
					</div>
					<nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden mb-12">
						{navItems.map((item) => (
							<NavItem
								key={item.path}
								item={item}
								activePath={location.pathname}
								sidebarCollapsed={false}
								toggleSidebar={toggleSidebar}
							/>
						))}
					</nav>
				</div>
			</SheetContent>
		</Sheet>
	);
}
