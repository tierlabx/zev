import { AnimateIcon } from "@animate-ui/react/icons";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "@zev/ui/components/animate-ui/icons/bell";
import { Globe } from "@zev/ui/components/animate-ui/icons/globe";
import { LogOut } from "@zev/ui/components/animate-ui/icons/log-out";
import { Maximize } from "@zev/ui/components/animate-ui/icons/maximize";
import { Menu } from "@zev/ui/components/animate-ui/icons/menu";
import { Minimize } from "@zev/ui/components/animate-ui/icons/minimize";
import { Moon } from "@zev/ui/components/animate-ui/icons/moon";
import { Search } from "@zev/ui/components/animate-ui/icons/search";
import { Sun } from "@zev/ui/components/animate-ui/icons/sun";
import { User } from "@zev/ui/components/animate-ui/icons/user";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@zev/ui/components/command";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLogoutMutation } from "@/api/system/auth";
import { useI18n } from "@/i18n";
import { clearSessionAndRedirectToLogin } from "@/router/session";
import { useUserStore } from "@/store";
import { useLayoutStore } from "@/store/layout";
import { getMenuIcon } from "@/utils/menu-icons";
import { flattenMenus } from "@/utils/menu-utils";

const RECENT_ROUTES_KEY = "zev-recent-routes";
const MAX_RECENT_ROUTES = 4;

function readRecentRoutes(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(RECENT_ROUTES_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
	} catch {
		return [];
	}
}

function pushRecentRoute(path: string): string[] {
	const next = [path, ...readRecentRoutes().filter((item) => item !== path)].slice(0, MAX_RECENT_ROUTES);
	try {
		window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));
	} catch {
		// 忽略隐私模式或配额限制
	}
	return next;
}

export function GlobalSearch() {
	const { locale, setLocale, t, translateMenu } = useI18n();
	const { resolvedTheme, setTheme } = useTheme();
	const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
	const menus = useUserStore((state) => state.menus);
	const logoutMutation = useLogoutMutation();
	const navigate = useNavigate();

	const [openCommand, setOpenCommand] = useState(false);
	const [recentPaths, setRecentPaths] = useState<string[]>(readRecentRoutes);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const isMac = useMemo(
		() => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
		[],
	);

	const searchableMenus = useMemo(() => flattenMenus(menus), [menus]);
	const menuByPath = useMemo(() => new Map(searchableMenus.map((m) => [m.path, m])), [searchableMenus]);

	const recentMenus = useMemo(
		() =>
			recentPaths.map((path) => menuByPath.get(path)).filter((m): m is (typeof searchableMenus)[number] => Boolean(m)),
		[recentPaths, menuByPath],
	);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpenCommand((open) => !open);
			}
		};
		const handleFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
		};
		document.addEventListener("keydown", down);
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("keydown", down);
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, []);

	const runCommand = useCallback((command: () => void) => {
		setOpenCommand(false);
		command();
	}, []);

	const navigateToRoute = useCallback(
		(path: string, recordRecent = true) => {
			if (recordRecent) {
				setRecentPaths(pushRecentRoute(path));
			}
			runCommand(() => navigate({ to: path as never }));
		},
		[navigate, runCommand],
	);

	const handleLogout = useCallback(() => {
		runCommand(async () => {
			try {
				await logoutMutation.mutateAsync();
			} catch {
				// 退出接口失败时仍清理本地凭证
			} finally {
				clearSessionAndRedirectToLogin();
			}
		});
	}, [logoutMutation, runCommand]);

	const isDark = resolvedTheme === "dark";

	return (
		<>
			<AnimateIcon animateOnHover asChild>
				<button
					type="button"
					onClick={() => setOpenCommand(true)}
					className="hidden md:flex items-center space-x-2 mr-2 px-2.5 py-1.5 bg-muted/70 border border-border/60 rounded-full text-muted-foreground hover:bg-muted cursor-pointer transition-colors outline-none"
				>
					<Search className="size-4" />
					<span className="text-xs">{t("header.search")}</span>
					<div className="flex items-center space-x-1 ml-4 text-[10px] bg-card border border-border text-muted-foreground px-1.5 py-0.5 rounded shadow-sm">
						<span>{isMac ? "⌘" : "Ctrl"}</span>
						<span>K</span>
					</div>
				</button>
			</AnimateIcon>

			<CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
				<CommandInput placeholder={t("header.searchPlaceholder")} />
				<CommandList>
					<CommandEmpty>{t("header.noSearchResults")}</CommandEmpty>

					{recentMenus.length > 0 && (
						<>
							<CommandGroup heading={t("header.recentRoutes")}>
								{recentMenus.map((menu) => {
									const Icon = getMenuIcon(menu.icon);
									return (
										<CommandItem
											key={`recent-${menu.path}`}
											value={`recent ${translateMenu(menu.path, menu.name)} ${menu.path}`}
											onSelect={() => navigateToRoute(menu.path)}
										>
											<Icon className="mr-2 size-4 text-muted-foreground" />
											<span>{translateMenu(menu.path, menu.name)}</span>
											<CommandShortcut>{menu.path}</CommandShortcut>
										</CommandItem>
									);
								})}
							</CommandGroup>
							<CommandSeparator />
						</>
					)}

					<CommandGroup heading={t("header.pageRoutes")}>
						{searchableMenus.map((menu) => {
							const Icon = getMenuIcon(menu.icon);
							const label = translateMenu(menu.path, menu.name);
							return (
								<CommandItem
									key={menu.path}
									value={`${label} ${menu.name} ${menu.path}`}
									onSelect={() => navigateToRoute(menu.path)}
								>
									<Icon className="mr-2 size-4 text-muted-foreground" />
									<span>{label}</span>
									<CommandShortcut>{menu.path}</CommandShortcut>
								</CommandItem>
							);
						})}
					</CommandGroup>

					<CommandSeparator />

					<CommandGroup heading={t("header.quickActions")}>
						<CommandItem
							value="theme dark light 主题 深色 浅色 夜间"
							onSelect={() => runCommand(() => setTheme(isDark ? "light" : "dark"))}
						>
							{isDark ? (
								<Sun className="mr-2 size-4 text-muted-foreground" />
							) : (
								<Moon className="mr-2 size-4 text-muted-foreground" />
							)}
							<span>{isDark ? t("header.switchToLight") : t("header.switchToDark")}</span>
						</CommandItem>

						<CommandItem
							value="language locale i18n 语言 中文 English 切换"
							onSelect={() => runCommand(() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN"))}
						>
							<Globe className="mr-2 size-4 text-muted-foreground" />
							<span>
								{t("header.switchLanguage")} ({locale === "zh-CN" ? "English" : "简体中文"})
							</span>
						</CommandItem>

						<CommandItem value="sidebar collapse toggle 侧边栏 折叠 展开" onSelect={() => runCommand(toggleSidebar)}>
							<Menu className="mr-2 size-4 text-muted-foreground" />
							<span>{t("header.toggleSidebar")}</span>
						</CommandItem>

						<CommandItem
							value="fullscreen maximize minimize 全屏"
							onSelect={() =>
								runCommand(() => {
									if (!document.fullscreenElement) {
										document.documentElement.requestFullscreen().catch(() => {});
									} else {
										document.exitFullscreen().catch(() => {});
									}
								})
							}
						>
							{isFullscreen ? (
								<Minimize className="mr-2 size-4 text-muted-foreground" />
							) : (
								<Maximize className="mr-2 size-4 text-muted-foreground" />
							)}
							<span>{isFullscreen ? t("header.exitFullscreen") : t("header.fullscreen")}</span>
						</CommandItem>

						<CommandItem value="profile account 个人中心 资料" onSelect={() => navigateToRoute("/profile", false)}>
							<User className="mr-2 size-4 text-muted-foreground" />
							<span>{t("header.profile")}</span>
							<CommandShortcut>/profile</CommandShortcut>
						</CommandItem>

						<CommandItem value="messages notice 通知 消息中心" onSelect={() => navigateToRoute("/messages", false)}>
							<Bell className="mr-2 size-4 text-muted-foreground" />
							<span>{translateMenu("/messages", "消息中心")}</span>
							<CommandShortcut>/messages</CommandShortcut>
						</CommandItem>

						<CommandItem
							value="logout signout 退出登录 注销"
							onSelect={handleLogout}
							className="text-destructive data-[selected=true]:text-destructive"
						>
							<LogOut className="mr-2 size-4" />
							<span>{t("header.logout")}</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}
