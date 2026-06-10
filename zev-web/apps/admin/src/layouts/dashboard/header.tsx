import { motion } from "framer-motion";
import { Bell, Globe, Menu, Moon, Search, Settings } from "lucide-react";
import { useLayoutStore } from "@/store/layout";
import { AccountDropdown } from "../components/account-dropdown";
import { Breadcrumb } from "../components/breadcrumb";

export function Header() {
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

	return (
		<header className="h-16 px-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between z-10 relative">
			<div className="flex items-center space-x-2">
				<button
					type="button"
					onClick={toggleSidebar}
					className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-md transition-colors"
				>
					<Menu className="size-4" />
				</button>
				<Breadcrumb />
			</div>
			<div className="flex items-center space-x-1">
				<div className="hidden md:flex items-center space-x-2 mr-2 px-2.5 py-1.5 bg-[#F5F5F5] rounded-full text-muted-foreground hover:bg-[#EBEBEB] cursor-pointer transition-colors">
					<Search className="size-4" />
					<span className="text-xs">搜索</span>
					<div className="flex items-center space-x-1 ml-4 text-[10px] bg-white px-1.5 py-0.5 rounded shadow-sm">
						<span>Ctrl</span>
						<span>K</span>
					</div>
				</div>
				<button
					type="button"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-full transition-colors group"
				>
					<Settings className="size-4" />
				</button>
				<button
					type="button"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-full transition-colors group"
				>
					<Moon className="size-4" />
				</button>
				<button
					type="button"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-full transition-colors group"
				>
					<Globe className="size-4" />
				</button>
				<button
					type="button"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-full transition-colors relative group"
				>
					<motion.div
						style={{ originY: 0 }}
						whileHover={{ rotate: [0, -15, 15, -15, 15, 0] }}
						transition={{ duration: 0.5, ease: "easeInOut" }}
					>
						<Bell className="size-4" />
					</motion.div>
					<span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
				</button>
				<div className="w-[1px] h-4 bg-[#E5E5E5] mx-2" />
				<AccountDropdown />
			</div>
		</header>
	);
}
