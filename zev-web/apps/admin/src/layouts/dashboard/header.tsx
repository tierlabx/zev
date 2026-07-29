import { motion } from "framer-motion";
import { Bell, Globe, Menu, Moon, Search, Sun, Maximize, Minimize } from "lucide-react";
import { useLayoutStore } from "@/store/layout";
import { AccountDropdown } from "../components/account-dropdown";
import { Breadcrumb } from "../components/breadcrumb";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@zev/ui/components/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@zev/ui/components/command";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNoticeList, markNoticeAsRead, type SysNotice } from "@/api/system/notice";

export function Header() {
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
	const { theme, setTheme } = useTheme();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [openCommand, setOpenCommand] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: notices = [] } = useQuery({
		queryKey: ["notices"],
		queryFn: getNoticeList,
		refetchInterval: 30000,
	});

	const { mutate: markAsRead } = useMutation({
		mutationFn: markNoticeAsRead,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notices"] });
		},
	});

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

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
		} else {
			document.exitFullscreen().catch(() => {});
		}
	};

	const runCommand = (command: () => void) => {
		setOpenCommand(false);
		command();
	};

	return (
		<header className="h-16 px-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between z-10 relative dark:bg-zinc-950 dark:border-zinc-800">
			<div className="flex items-center space-x-2">
				<button
					type="button"
					onClick={toggleSidebar}
					className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
				>
					<Menu className="size-4" />
				</button>
				<Breadcrumb />
			</div>
			<div className="flex items-center space-x-1">
				<div
					onClick={() => setOpenCommand(true)}
					className="hidden md:flex items-center space-x-2 mr-2 px-2.5 py-1.5 bg-[#F5F5F5] dark:bg-zinc-900 rounded-full text-muted-foreground hover:bg-[#EBEBEB] dark:hover:bg-zinc-800 cursor-pointer transition-colors"
				>
					<Search className="size-4" />
					<span className="text-xs">搜索</span>
					<div className="flex items-center space-x-1 ml-4 text-[10px] bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded shadow-sm border dark:border-zinc-700">
						<span>Ctrl</span>
						<span>K</span>
					</div>
				</div>

				<CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
					<CommandInput placeholder="输入关键词搜索页面..." />
					<CommandList>
						<CommandEmpty>未找到结果</CommandEmpty>
						<CommandGroup heading="页面路由">
							<CommandItem onSelect={() => runCommand(() => navigate({ to: "/" }))}>仪表盘</CommandItem>
							<CommandItem onSelect={() => runCommand(() => navigate({ to: "/system/user" }))}>用户管理</CommandItem>
							<CommandItem onSelect={() => runCommand(() => navigate({ to: "/system/role" }))}>角色管理</CommandItem>
							<CommandItem onSelect={() => runCommand(() => navigate({ to: "/system/menu" }))}>菜单管理</CommandItem>
							<CommandItem onSelect={() => runCommand(() => navigate({ to: "/system/dict" }))}>字典管理</CommandItem>
						</CommandGroup>
					</CommandList>
				</CommandDialog>

				<button
					type="button"
					onClick={toggleFullscreen}
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group"
				>
					{isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
				</button>

				<button
					type="button"
					onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group"
				>
					{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
				</button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group outline-none"
						>
							<Globe className="size-4" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>简体中文</DropdownMenuItem>
						<DropdownMenuItem>English</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors relative group outline-none"
						>
							<motion.div
								style={{ originY: 0 }}
								whileHover={{ rotate: [0, -15, 15, -15, 15, 0] }}
								transition={{ duration: 0.5, ease: "easeInOut" }}
							>
								<Bell className="size-4" />
							</motion.div>
							{notices.length > 0 && (
								<span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-zinc-950"></span>
							)}
						</button>
					</PopoverTrigger>
					<PopoverContent align="end" className="w-80 p-0">
						<div className="flex flex-col">
							<div className="flex items-center justify-between p-4 border-b">
								<h4 className="font-semibold text-sm">通知 ({notices.length})</h4>
							</div>
							<div className="max-h-80 overflow-y-auto">
								{notices.length > 0 ? (
									<div className="flex flex-col">
										{notices.map((notice: SysNotice) => (
											<div key={notice.id} className="flex flex-col gap-1 p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => markAsRead(notice.id)}>
												<div className="flex items-center justify-between">
													<span className="font-medium text-sm">{notice.title}</span>
													<span className="text-[10px] text-muted-foreground">{new Date(notice.CreatedAt).toLocaleDateString()}</span>
												</div>
												<p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
											</div>
										))}
									</div>
								) : (
									<div className="p-4 text-sm text-muted-foreground text-center">暂无新通知。</div>
								)}
							</div>
						</div>
					</PopoverContent>
				</Popover>

				<div className="w-[1px] h-4 bg-[#E5E5E5] dark:bg-zinc-800 mx-2" />
				<AccountDropdown />
			</div>
		</header>
	);
}
