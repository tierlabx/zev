import { Link, useLocation, useMatches, useNavigate } from "@tanstack/react-router";
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

export function TagsView() {
	const { t, translateMenu } = useI18n();
	const location = useLocation();
	const navigate = useNavigate();
	const matches = useMatches();
	const { visitedViews, addView, removeView, closeOthers, closeAll } = useTagsStore();
	const menus = useUserStore((state) => state.menus);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// 获取第一个可用页面路径（用于回退导航）
	const firstPagePath = findFirstPagePath(menus) || "/login";

	useEffect(() => {
		// find the deepest match that has a title in staticData
		const match = [...matches].reverse().find((m) => m.staticData?.title);
		const title = (match?.staticData?.title as string) || "";

		// 第一个页面路径的标签不可关闭
		const isHome = location.pathname === firstPagePath;

		addView({
			path: location.pathname,
			title: title,
			closable: !isHome,
		});
	}, [location.pathname, matches, addView, firstPagePath]);

	const handleClose = (e: React.MouseEvent, path: string) => {
		e.preventDefault();
		e.stopPropagation();

		const index = visitedViews.findIndex((v) => v.path === path);
		removeView(path);

		// If we are closing the active tab, navigate to the adjacent tab
		if (path === location.pathname) {
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
		<div className="flex items-center h-[34px] bg-card border-b border-border px-2 shadow-sm text-sm relative z-10">
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
					const isActive = location.pathname === view.path;
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
					<DropdownMenuItem onClick={() => closeOthers(location.pathname)}>{t("tags.closeOthers")}</DropdownMenuItem>
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
