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
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";
import { flattenMenus } from "@/utils/menu-utils";

export function GlobalSearch() {
	const { t, translateMenu } = useI18n();
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
				className="hidden md:flex items-center space-x-2 mr-2 px-2.5 py-1.5 bg-muted/70 border border-border/60 rounded-full text-muted-foreground hover:bg-muted cursor-pointer transition-colors outline-none"
			>
				<Search className="size-4" />
				<span className="text-xs">{t("header.search")}</span>
				<div className="flex items-center space-x-1 ml-4 text-[10px] bg-card border border-border text-muted-foreground px-1.5 py-0.5 rounded shadow-sm">
					<span>Ctrl</span>
					<span>K</span>
				</div>
			</button>

			<CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
				<CommandInput placeholder={t("header.searchPlaceholder")} />
				<CommandList>
					<CommandEmpty>{t("header.noSearchResults")}</CommandEmpty>
					<CommandGroup heading={t("header.pageRoutes")}>
						{searchableMenus.map((menu) => (
							<CommandItem key={menu.path} onSelect={() => runCommand(() => navigate({ to: menu.path as never }))}>
								{translateMenu(menu.path, menu.name)}
							</CommandItem>
						))}
						{[
							{ path: "/messages", name: "消息中心" },
							{ path: "/profile", name: "个人中心" },
						]
							.filter((item) => !searchableMenus.some((menu) => menu.path === item.path))
							.map((item) => (
								<CommandItem key={item.path} onSelect={() => runCommand(() => navigate({ to: item.path as never }))}>
									{translateMenu(item.path, item.name)}
								</CommandItem>
							))}
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}
