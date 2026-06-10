import { SidebarTrigger } from "@zev/ui/components/sidebar";
import { motion } from "framer-motion";
import { Bell, Github } from "lucide-react";
import { AccountDropdown } from "../components/account-dropdown";
import { Breadcrumb } from "../components/breadcrumb";

export function Header() {
	return (
		<header className="h-16 px-6 bg-white/60 backdrop-blur-xl border-b border-[#E5E5E5] flex items-center justify-between z-10 relative">
			<div className="flex items-center space-x-4">
				<SidebarTrigger className="-ml-2" />
				<Breadcrumb />
			</div>
			<div className="flex items-center space-x-2">
				<a
					href="https://github.com/ve-we/zev"
					target="_blank"
					rel="noreferrer"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-full transition-colors group"
				>
					<motion.div
						whileHover={{ rotate: [0, -10, 10, -10, 10, 0] }}
						transition={{ duration: 0.5, ease: "easeInOut" }}
					>
						<Github className="size-[18px]" />
					</motion.div>
				</a>
				<button
					type="button"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-full transition-colors relative group"
				>
					<motion.div
						style={{ originY: 0 }}
						whileHover={{ rotate: [0, -15, 15, -15, 15, 0] }}
						transition={{ duration: 0.5, ease: "easeInOut" }}
					>
						<Bell className="size-[18px]" />
					</motion.div>
					<span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
				</button>
				<div className="w-[1px] h-4 bg-[#E5E5E5] mx-1" />
				<AccountDropdown />
			</div>
		</header>
	);
}
