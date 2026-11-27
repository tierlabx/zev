import { Button } from "@zev/ui/components/button";
import {
	PaginationButton,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	Pagination as PaginationNav,
} from "@zev/ui/components/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { cn } from "@zev/ui/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useI18n } from "@/i18n";

interface PaginationProps {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	className?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, className }: PaginationProps) {
	const { t } = useI18n();
	const safeTotalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(Math.max(1, page), safeTotalPages);

	const getPageItems = (): Array<number | "ellipsis"> => {
		const maxVisible = 5;
		if (safeTotalPages <= maxVisible) {
			return Array.from({ length: safeTotalPages }, (_, idx) => idx + 1);
		}
		if (currentPage <= 3) {
			return [1, 2, 3, 4, "ellipsis", safeTotalPages];
		}
		if (currentPage >= safeTotalPages - 2) {
			return [1, "ellipsis", safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages];
		}
		return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", safeTotalPages];
	};

	const pageItems = getPageItems();
	let ellipsisIndex = 0;

	return (
		<div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 px-1", className)}>
			<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
				<Select value={pageSize.toString()} onValueChange={(val) => onPageSizeChange(Number(val))}>
					<SelectTrigger className="h-8 w-[70px] bg-background text-foreground text-xs shadow-none">
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
				<span>{t("table.rowsPerPage")}</span>
				<span className="tabular-nums text-muted-foreground/80">({t("table.totalRecords", { total })})</span>
			</div>

			<div className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
				<span className="text-xs font-medium text-foreground tabular-nums">
					{t("table.pageOf", { page: currentPage, totalPages: safeTotalPages })}
				</span>

				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="hidden h-8 w-8 shadow-none sm:inline-flex"
						onClick={() => onPageChange(1)}
						disabled={currentPage <= 1}
						aria-label={t("table.firstPage")}
						title={t("table.firstPage")}
					>
						<ChevronsLeft className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-8 w-8 shadow-none"
						onClick={() => onPageChange(currentPage - 1)}
						disabled={currentPage <= 1}
						aria-label={t("table.prevPage")}
						title={t("table.prevPage")}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>

					{/* 仅页码按钮组由 Animate UI Pagination Root 管理滑动高亮指示器 */}
					<PaginationNav className="mx-0 w-auto justify-end">
						<PaginationContent>
							{pageItems.map((item) => {
								if (item === "ellipsis") {
									ellipsisIndex += 1;
									return (
										<PaginationItem key={`ellipsis-${ellipsisIndex}`}>
											<PaginationEllipsis />
										</PaginationItem>
									);
								}
								return (
									<PaginationItem key={item}>
										<PaginationButton isActive={currentPage === item} onClick={() => onPageChange(item)}>
											{item}
										</PaginationButton>
									</PaginationItem>
								);
							})}
						</PaginationContent>
					</PaginationNav>

					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-8 w-8 shadow-none"
						onClick={() => onPageChange(currentPage + 1)}
						disabled={currentPage >= safeTotalPages}
						aria-label={t("table.nextPage")}
						title={t("table.nextPage")}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="hidden h-8 w-8 shadow-none sm:inline-flex"
						onClick={() => onPageChange(safeTotalPages)}
						disabled={currentPage >= safeTotalPages}
						aria-label={t("table.lastPage")}
						title={t("table.lastPage")}
					>
						<ChevronsRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
