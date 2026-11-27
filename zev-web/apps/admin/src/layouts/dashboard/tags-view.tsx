import { Link, useMatches, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@zev/ui/components/dropdown-menu";
import { cn } from "@zev/ui/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, RotateCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";
import { useTagsStore } from "@/store/tags";
import { findFirstPagePath } from "@/utils/menu-utils";

function normalizeTagPath(path: string): string {
	if (!path) return "";
	return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function TagsView() {
	const { t, translateMenu } = useI18n();
	const navigate = useNavigate();
	const matches = useMatches();
	const resolvedPathname = useRouterState({
		select: (s) => normalizeTagPath(s.resolvedLocation?.pathname ?? s.location.pathname),
	});
	const isRouterPending = useRouterState({
		select: (s) => s.status === "pending",
	});
	const { visitedViews, addView, removeView, closeOthers, closeAll } = useTagsStore();
	const menus = useUserStore((state) => state.menus);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// 获取第一个可用页面路径（用于回退导航）
	const firstPagePath = normalizeTagPath(findFirstPagePath(menus) || "/login");

	useEffect(() => {
		// 仅在路由已稳定提交且命中真实页面（非目录、非 403/404 等隐藏标签页）时写入标签栏，避免无权限重定向残留幽灵标签
		if (isRouterPending) return;

		const match = [...matches].reverse().find((m) => m.staticData?.title);
		if (!match || match.staticData?.hideInTags || match.staticData?.isDirectory) {
			return;
		}

		const matchPath = normalizeTagPath(match.pathname);
		if (!matchPath || matchPath !== resolvedPathname) {
			return;
		}

		const title = (match.staticData?.title as string) || "";
		const isHome = resolvedPathname === firstPagePath;

		addView({
			path: resolvedPathname,
			title,
			closable: !isHome,
		});
	}, [isRouterPending, resolvedPathname, matches, addView, firstPagePath]);

	const handleClose = (e: React.MouseEvent, path: string) => {
		e.preventDefault();
		e.stopPropagation();

		const index = visitedViews.findIndex((v) => v.path === path);
		removeView(path);

		// If we are closing the active tab, navigate to the adjacent tab
		if (path === resolvedPathname) {
			const prevView = visitedViews[index - 1] || visitedViews[index + 1];
			if (prevView) {
				navigate({ to: prevView.path as never });
			} else {
				navigate({ to: firstPagePath as never });
			}
		}
	};

	const scroll = (direction: "left" | "right") => {
		if (scrollContainerRef.current) {
			const scrollAmount = 200;
			scrollContainerRef.current.scrollBy({
				left: direction === "left" ? -scrollAmount : scrollAmount,
				behavior: "smooth",
			});
		}
	};

	return (
		<div className="flex items-center h-[34px] bg-background border-b border-border px-2 text-sm relative z-10">
			<button
				type="button"
				onClick={() => scroll("left")}
				className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
			>
				<ChevronLeft className="h-4 w-4" />
			</button>

			<div
				ref={scrollContainerRef}
				className="flex-1 overflow-x-auto flex items-center gap-1.5 h-full px-1 scroll-smooth [&::-webkit-scrollbar]:hidden"
				style={{ scrollbarWidth: "none", msScrollSnapType: "none" }}
			>
				{visitedViews.map((view) => {
					const isActive = resolvedPathname === view.path;
					return (
						<Link
							key={view.path}
							to={view.path as never}
							className={cn(
								"flex items-center gap-2 h-[26px] px-3 border rounded-sm transition-colors whitespace-nowrap",
								isActive
									? "bg-[var(--color-primary-light)] border-primary text-primary"
									: "bg-background/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
							)}
						>
							{isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
							<span className="text-xs">{translateMenu(view.path, view.title || t("tags.newTab"))}</span>
							{view.closable !== false && (
								<X
									className="h-3 w-3 rounded-full hover:bg-foreground/10 p-[1px] -mr-1 transition-colors"
									onClick={(e) => handleClose(e, view.path)}
								/>
							)}
						</Link>
					);
				})}
			</div>

			<button
				type="button"
				onClick={() => scroll("right")}
				className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground border-l border-border ml-1 cursor-pointer"
			>
				<ChevronRight className="h-4 w-4" />
			</button>

			<button
				type="button"
				onClick={() => window.location.reload()}
				className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground border-l border-border cursor-pointer"
			>
				<RotateCw className="h-3.5 w-3.5" />
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground border-l border-border cursor-pointer"
					>
						<ChevronDown className="h-3.5 w-3.5" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem onClick={() => closeOthers(resolvedPathname)}>{t("tags.closeOthers")}</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							closeAll();
							navigate({ to: firstPagePath as never });
						}}
					>
						{t("tags.closeAll")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
