import { Highlight } from "@animate-ui/react/primitives/effects/highlight";
import { useLocation } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTrigger } from "@zev/ui/components/sheet";
import logoUrl from "@/assets/logo-animated.svg";
import { useUserStore } from "@/store";
import { buildNavItems, NavItem } from "./nav-item";
import { SidebarFireworksBackground } from "./sidebar-fireworks-background";

export function MobileSidebar({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const menus = useUserStore((state) => state.menus);
	const navItems = buildNavItems(menus);
	const toggleSidebar = () => {}; // Dummy toggle for mobile

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent side="left" className="w-[240px] p-0 bg-card border-r-border">
				<div className="relative flex flex-col h-full overflow-hidden">
					<SidebarFireworksBackground />
					<div className="h-16 px-4 flex items-center justify-center space-x-3 border-b border-border overflow-hidden shrink-0 relative z-10 bg-card/70 backdrop-blur-[1px]">
						<div className="flex aspect-square size-8 items-center justify-center shrink-0">
							<img src={logoUrl} alt="Logo" className="size-8" />
						</div>
						<span className="text-base font-semibold truncate whitespace-nowrap text-foreground">Zev Admin</span>
					</div>
					<nav className="relative z-10 flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden mb-12">
						<Highlight hover controlledItems exitDelay={100} className="inset-0 rounded-md bg-muted">
							{navItems.map((item) => (
								<NavItem
									key={item.path}
									item={item}
									activePath={location.pathname}
									sidebarCollapsed={false}
									toggleSidebar={toggleSidebar}
								/>
							))}
						</Highlight>
					</nav>
				</div>
			</SheetContent>
		</Sheet>
	);
}
