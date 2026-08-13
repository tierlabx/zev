import { useNavigate } from "@tanstack/react-router";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@zev/ui/components/command";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store";
import { flattenMenus } from "@/utils/menu-utils";

export function GlobalSearch() {
	const [openCommand, setOpenCommand] = useState(false);
	const navigate = useNavigate();
	const menus = useUserStore((state) => state.menus);

	const searchableMenus = flattenMenus(menus);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpenCommand((open) => !open);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const runCommand = (command: () => void) => {
		setOpenCommand(false);
		command();
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpenCommand(true)}
				className="hidden md:flex items-center space-x-2 mr-2 px-2.5 py-1.5 bg-[#F5F5F5] dark:bg-zinc-900 rounded-full text-muted-foreground hover:bg-[#EBEBEB] dark:hover:bg-zinc-800 cursor-pointer transition-colors outline-none"
			>
				<Search className="size-4" />
				<span className="text-xs">搜索</span>
				<div className="flex items-center space-x-1 ml-4 text-[10px] bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded shadow-sm border dark:border-zinc-700">
					<span>Ctrl</span>
					<span>K</span>
				</div>
			</button>

			<CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
				<CommandInput placeholder="输入关键词搜索页面..." />
				<CommandList>
					<CommandEmpty>未找到结果</CommandEmpty>
					<CommandGroup heading="页面路由">
						{searchableMenus.map((menu) => (
							<CommandItem key={menu.path} onSelect={() => runCommand(() => navigate({ to: menu.path as never }))}>
								{menu.name}
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}
