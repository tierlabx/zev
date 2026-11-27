import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";
import { cn } from "@zev/ui/lib/utils";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";

import { Pagination } from "./pagination";
import { ZevTableSkeleton } from "./table-skeleton";
import { TableToolbar } from "./table-toolbar";
import type { ZevTableProps } from "./types";
import { getPinningStyles } from "./utils";

export { type FacetedFilterOption, TableFacetedFilter, type TableFacetedFilterProps } from "./faceted-filter";

export function ZevTable<TData, TValue>({
	columns,
	data,
	isLoading,
	pagination = true,
	page = 1,
	pageSize = 10,
	total = 0,
	onPageChange,
	onPageSizeChange,
	enableRowSelection = false,
	onSelectionChange,
	toolbarLeft,
	toolbarRight,
	className,
	containerHeight,
	showToolbar = true,
	onRowClick,
}: ZevTableProps<TData, TValue>) {
	const { t } = useI18n();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const pinnedLeft = useMemo(
		() =>
			columns
				// biome-ignore lint/suspicious/noExplicitAny: Accessor key is only available on AccessorColumnDef
				.filter((c: ColumnDef<TData, TValue>) => (c.meta as any)?.fixed === "left")
				// biome-ignore lint/suspicious/noExplicitAny: Accessor key is only available on AccessorColumnDef
				.map((c: any) => c.accessorKey || c.id) as string[],
		[columns],
	);
	const pinnedRight = useMemo(
		() =>
			columns
				// biome-ignore lint/suspicious/noExplicitAny: Accessor key is only available on AccessorColumnDef
				.filter((c: ColumnDef<TData, TValue>) => (c.meta as any)?.fixed === "right")
				// biome-ignore lint/suspicious/noExplicitAny: Accessor key is only available on AccessorColumnDef
				.map((c: any) => c.accessorKey || c.id) as string[],
		[columns],
	);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnPinning: { left: pinnedLeft, right: pinnedRight },
		},
		enableRowSelection,
		enablePinning: true,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	// Trigger onSelectionChange when rowSelection changes
	useEffect(() => {
		if (onSelectionChange) {
			const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
			onSelectionChange(selectedRows);
		}
	}, [table, onSelectionChange]);

	const { rows } = table.getRowModel();
	const tableContainerRef = useRef<HTMLDivElement>(null);

	// 统一保留虚拟化支持，在不分页（加载大量数据）时提升性能
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => 48,
		overscan: 5,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();

	const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
	const paddingBottom = virtualItems.length > 0 ? totalSize - (virtualItems?.[virtualItems.length - 1]?.end || 0) : 0;

	return (
		<div
			className={cn("flex flex-col gap-3 w-full min-w-0", className)}
			style={containerHeight ? { height: containerHeight } : undefined}
		>
			<TableToolbar table={table} showColumnToggle={showToolbar} left={toolbarLeft} right={toolbarRight} />

			{/* 表格本体保留唯一一层圆角边框，避免“大 Card 套小 Card”的视觉冗余 */}
			<div className="relative flex-1 min-h-0 w-full rounded-md border border-border bg-card text-card-foreground overflow-hidden flex flex-col">
				<div ref={tableContainerRef} className="w-full overflow-auto relative flex-1 min-h-0">
					{isLoading && data.length === 0 ? (
						<ZevTableSkeleton table={table} columns={columns} pageSize={pageSize} />
					) : (
						<table
							className="min-w-full caption-bottom text-sm relative"
							style={{ tableLayout: "fixed", width: table.getTotalSize() }}
						>
							<TableHeader className="sticky top-0 z-20">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id} className="bg-card border-b border-border hover:bg-card">
										{headerGroup.headers.map((header) => {
											const canSort = header.column.getCanSort();
											const sorted = header.column.getIsSorted();
											return (
												<TableHead
													key={header.id}
													colSpan={header.colSpan}
													style={{ ...getPinningStyles(header.column) }}
													className={cn(
														// 固定表头保持不透明背景，避免横向滚动时底层表头文字透出
														"h-10 px-3 text-xs font-medium text-muted-foreground transition-colors group bg-card",
													)}
												>
													{/* biome-ignore lint/a11y/useKeyWithClickEvents: Click is bound to column sorting */}
													{/* biome-ignore lint/a11y/noStaticElementInteractions: Click is bound to column sorting */}
													<div
														className={cn(
															"flex items-center gap-1.5 h-full w-full",
															canSort ? "cursor-pointer select-none hover:text-foreground" : "",
														)}
														onClick={header.column.getToggleSortingHandler()}
													>
														{header.isPlaceholder ? null : (
															<>
																{flexRender(header.column.columnDef.header, header.getContext())}
																{canSort ? (
																	sorted === "asc" ? (
																		<ChevronUp className="h-3.5 w-3.5 text-foreground shrink-0" />
																	) : sorted === "desc" ? (
																		<ChevronDown className="h-3.5 w-3.5 text-foreground shrink-0" />
																	) : (
																		<ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
																	)
																) : null}
															</>
														)}
													</div>
													{header.column.getCanResize() && (
														// biome-ignore lint/a11y/noStaticElementInteractions: Resizer is handled by table library
														<div
															onMouseDown={header.getResizeHandler()}
															onTouchStart={header.getResizeHandler()}
															className={cn(
																"absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity",
																header.column.getIsResizing() ? "bg-primary opacity-100" : "",
															)}
														/>
													)}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{paddingTop > 0 && (
									<tr>
										<td style={{ height: `${paddingTop}px` }} />
									</tr>
								)}

								{virtualItems.map((virtualRow) => {
									const row = rows[virtualRow.index];
									// 尝试获取唯一标识作为 key，如果没有则回退到 row.id
									// biome-ignore lint/suspicious/noExplicitAny: Generic row mapping fallback
									const rowKey = (row.original as any).ID || (row.original as any).id || row.id;

									return (
										<TableRow
											key={rowKey}
											data-index={virtualRow.index}
											ref={rowVirtualizer.measureElement}
											onClick={() => onRowClick?.(row.original)}
											data-state={row.getIsSelected() && "selected"}
											className={cn(
												onRowClick && "cursor-pointer",
												"group/row bg-card transition-colors hover:bg-muted/50 border-border",
												row.getIsSelected() && "bg-muted/70",
											)}
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell
													key={cell.id}
													style={{ ...getPinningStyles(cell.column) }}
													className={cn(
														"px-3 py-2.5 text-card-foreground transition-colors",
														// 固定列使用不透明背景，避免横向滚动时底层单元格穿透
														cell.column.getIsPinned() &&
															(row.getIsSelected() ? "bg-muted" : "bg-card group-hover/row:bg-muted"),
													)}
												>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
										</TableRow>
									);
								})}

								{paddingBottom > 0 && (
									<tr>
										<td style={{ height: `${paddingBottom}px` }} />
									</tr>
								)}

								{!isLoading && rows.length === 0 && (
									<TableRow>
										<TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
											{t("table.noData")}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</table>
					)}
				</div>
			</div>

			{pagination && onPageChange && onPageSizeChange && (
				<div className="shrink-0">
					<Pagination
						page={page}
						pageSize={pageSize}
						total={total}
						onPageChange={onPageChange}
						onPageSizeChange={onPageSizeChange}
					/>
				</div>
			)}
		</div>
	);
}
