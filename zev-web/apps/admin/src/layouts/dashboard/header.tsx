import { AnimateIcon } from "@animate-ui/react/icons";
import { Menu } from "@zev/ui/components/animate-ui/icons/menu";
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
				{/* 桌面端侧边栏折叠按钮 */}
				<AnimateIcon animateOnHover asChild>
					<button
						type="button"
						onClick={toggleSidebar}
						className="hidden md:flex p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
					>
						<Menu className="size-4" />
					</button>
				</AnimateIcon>

				{/* 移动端侧边栏抽屉触发按钮：将 AnimateIcon 置入内部避免与 SheetTrigger asChild 冲突 */}
				<MobileSidebar>
					<button
						type="button"
						className="md:hidden p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
					>
						<AnimateIcon animateOnHover className="inline-flex items-center justify-center">
							<Menu className="size-4" />
						</AnimateIcon>
					</button>
				</MobileSidebar>

				<Breadcrumb />
			</div>
			<div className="flex items-center space-x-1">
				<GlobalSearch />
				<HeaderActions />
				<NoticePopover />

				<div className="w-[1px] h-4 bg-border mx-2" />
				<AccountDropdown />
			</div>
		</header>
	);
}
