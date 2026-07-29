import { Button } from "@zev/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { cn } from "@zev/ui/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	className?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, className }: PaginationProps) {
	const totalPages = Math.ceil(total / pageSize);

	const renderPageNumbers = () => {
		const pages = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			if (page <= 3) {
				pages.push(1, 2, 3, 4, "ellipsis", totalPages);
			} else if (page >= totalPages - 2) {
				pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
			} else {
				pages.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages);
			}
		}

		return pages.map((p, idx) => {
			if (p === "ellipsis") {
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static array mapping for pagination
					<div key={`ellipsis-${idx}`} className="flex items-end justify-center w-8 h-8 pb-1 text-gray-400">
						<MoreHorizontal className="w-4 h-4" />
					</div>
				);
			}
			return (
				<Button
					key={p}
					variant="ghost"
					size="icon"
					className={cn(
						"w-8 h-8 rounded-md text-sm transition-colors",
						page === p
							? "bg-black text-white hover:bg-gray-800 hover:text-white"
							: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
					)}
					onClick={() => onPageChange(p as number)}
				>
					{p}
				</Button>
			);
		});
	};

	return (
		<div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2", className)}>
			<div className="flex items-center space-x-2 text-sm text-gray-500">
				<span>共 {total} 条记录</span>
				<div className="flex items-center space-x-2">
					<span className="hidden sm:inline-block">每页</span>
					<Select value={pageSize.toString()} onValueChange={(val) => onPageSizeChange(Number(val))}>
						<SelectTrigger className="h-8 w-[70px] bg-white text-xs">
							<SelectValue placeholder={pageSize.toString()} />
						</SelectTrigger>
						<SelectContent>
							{[10, 20, 50, 100].map((size) => (
								<SelectItem key={size} value={size.toString()}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<span className="hidden sm:inline-block">条</span>
				</div>
			</div>

			<div className="flex items-center space-x-1">
				<Button
					variant="ghost"
					size="icon"
					className="w-8 h-8 rounded-md text-gray-500 hover:text-gray-900"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
				>
					<ChevronLeft className="w-4 h-4" />
				</Button>
				{renderPageNumbers()}
				<Button
					variant="ghost"
					size="icon"
					className="w-8 h-8 rounded-md text-gray-500 hover:text-gray-900"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= totalPages || totalPages === 0}
				>
					<ChevronRight className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}
