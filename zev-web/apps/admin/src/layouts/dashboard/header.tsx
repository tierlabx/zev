import { Menu } from "lucide-react";
import { useLayoutStore } from "@/store/layout";
import { AccountDropdown } from "../components/account-dropdown";
import { Breadcrumb } from "../components/breadcrumb";
import { GlobalSearch } from "./components/global-search";
import { HeaderActions } from "./components/header-actions";
import { NoticePopover } from "./components/notice-popover";
import { MobileSidebar } from "./sidebar";

export function Header() {
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

	return (
		<header className="h-16 px-4 bg-card border-b border-border flex items-center justify-between z-10 relative">
			<div className="flex items-center space-x-2">
				{/* Desktop Sidebar Toggle */}
				<button
					type="button"
					onClick={toggleSidebar}
					className="hidden md:flex p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
				>
					<Menu className="size-4" />
				</button>

				{/* Mobile Sidebar Toggle (Drawer) */}
				<MobileSidebar>
					<button
						type="button"
						className="md:hidden p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
					>
						<Menu className="size-4" />
					</button>
				</MobileSidebar>

				<Breadcrumb />
			</div>
			<div className="flex items-center space-x-1">
				<GlobalSearch />
				<HeaderActions />
				<NoticePopover />

				<div className="w-[1px] h-4 bg-[#E5E5E5] dark:bg-zinc-800 mx-2" />
				<AccountDropdown />
			</div>
		</header>
	);
}
