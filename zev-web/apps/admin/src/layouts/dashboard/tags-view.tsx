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
import { useTagsStore } from "@/store/tags";

export function TagsView() {
	const location = useLocation();
	const navigate = useNavigate();
	const matches = useMatches();
	const { visitedViews, addView, removeView, closeOthers, closeAll } = useTagsStore();
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// find the deepest match that has a title in staticData
		const match = [...matches].reverse().find((m) => m.staticData?.title);
		const title = (match?.staticData?.title as string) || "新标签";

		addView({
			path: location.pathname,
			title: title,
			closable: location.pathname !== "/dashboard",
		});
	}, [location.pathname, matches, addView]);

	const handleClose = (e: React.MouseEvent, path: string) => {
		e.preventDefault();
		e.stopPropagation();

		const index = visitedViews.findIndex((v) => v.path === path);
		removeView(path);

		// If we are closing the active tab, navigate to the adjacent tab
		if (path === location.pathname) {
			const prevView = visitedViews[index - 1] || visitedViews[0];
			if (prevView) {
				navigate({ to: prevView.path });
			} else {
				navigate({ to: "/dashboard" });
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
		<div className="flex items-center h-[34px] bg-white border-b border-[#E5E5E5] px-2 shadow-sm text-sm relative z-10">
			<button
				type="button"
				onClick={() => scroll("left")}
				className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-black/5 hover:text-foreground cursor-pointer"
			>
				<ChevronLeft className="h-4 w-4" />
			</button>

			<div
				ref={scrollContainerRef}
				className="flex-1 overflow-x-auto flex items-center gap-1.5 h-full px-1 scroll-smooth"
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
				<style>{`div::-webkit-scrollbar { display: none; }`}</style>
				{visitedViews.map((view) => {
					const isActive = location.pathname === view.path;
					return (
						<Link
							key={view.path}
							to={view.path}
							className={cn(
								"flex items-center gap-2 h-[26px] px-3 border rounded-sm transition-colors whitespace-nowrap",
								isActive
									? "bg-[#E6F4FF] border-[#1677FF] text-[#1677FF]"
									: "bg-white border-[#E5E5E5] text-[#666] hover:text-[#1677FF]",
							)}
						>
							{isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#1677FF]" />}
							<span className="text-xs">{view.title}</span>
							{view.closable !== false && (
								<X
									className="h-3 w-3 rounded-full hover:bg-black/10 p-[1px] -mr-1 transition-colors"
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
				className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-black/5 hover:text-foreground border-l border-[#E5E5E5] ml-1 cursor-pointer"
			>
				<ChevronRight className="h-4 w-4" />
			</button>

			<button
				type="button"
				onClick={() => window.location.reload()}
				className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-black/5 hover:text-foreground border-l border-[#E5E5E5] cursor-pointer"
			>
				<RotateCw className="h-3.5 w-3.5" />
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex-shrink-0 px-2 h-full flex items-center justify-center text-muted-foreground hover:bg-black/5 hover:text-foreground border-l border-[#E5E5E5] cursor-pointer"
					>
						<ChevronDown className="h-3.5 w-3.5" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem onClick={() => closeOthers(location.pathname)}>关闭其他</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							closeAll();
							navigate({ to: "/dashboard" });
						}}
					>
						关闭全部
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
