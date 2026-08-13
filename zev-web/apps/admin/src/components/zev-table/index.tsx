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
import * as React from "react";

import { Pagination } from "./pagination";
import { ZevTableSkeleton } from "./table-skeleton";
import { TableToolbar } from "./table-toolbar";
import type { ZevTableProps } from "./types";
import { getPinningStyles } from "./utils";

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
	className,
	containerHeight,
	showToolbar = true,
	onRowClick,
}: ZevTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

	const pinnedLeft = React.useMemo(
		() =>
			columns
				// biome-ignore lint/suspicious/noExplicitAny: Accessor key is only available on AccessorColumnDef
				.filter((c: ColumnDef<TData, TValue>) => (c.meta as any)?.fixed === "left")
				// biome-ignore lint/suspicious/noExplicitAny: Accessor key is only available on AccessorColumnDef
				.map((c: any) => c.accessorKey || c.id) as string[],
		[columns],
	);
	const pinnedRight = React.useMemo(
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
	React.useEffect(() => {
		if (onSelectionChange) {
			const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
			onSelectionChange(selectedRows);
		}
	}, [table, onSelectionChange]);

	const { rows } = table.getRowModel();
	const tableContainerRef = React.useRef<HTMLDivElement>(null);

	// 统一保留虚拟化支持，在不分页（加载大量数据）时提升性能
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => 52,
		overscan: 5,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();

	const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
	const paddingBottom = virtualItems.length > 0 ? totalSize - (virtualItems?.[virtualItems.length - 1]?.end || 0) : 0;

	return (
		<div
			className={cn("relative w-full rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col", className)}
			style={containerHeight ? { height: containerHeight } : undefined}
		>
			{showToolbar && <TableToolbar table={table} />}

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
								<TableRow key={headerGroup.id} className="bg-gray-50/90 backdrop-blur-md border-b-gray-200">
									{headerGroup.headers.map((header) => {
										return (
											<TableHead
												key={header.id}
												colSpan={header.colSpan}
												style={{ ...getPinningStyles(header.column) }}
												className={cn(
													"transition-colors text-gray-600 font-medium group bg-gray-50/90 backdrop-blur-md",
												)}
											>
												{/* biome-ignore lint/a11y/useKeyWithClickEvents: Click is bound to column sorting */}
												{/* biome-ignore lint/a11y/noStaticElementInteractions: Click is bound to column sorting */}
												<div
													className={cn(
														"flex items-center space-x-2 h-full w-full",
														header.column.getCanSort() ? "cursor-pointer select-none hover:text-gray-900" : "",
													)}
													onClick={header.column.getToggleSortingHandler()}
												>
													{header.isPlaceholder ? null : (
														<>
															{flexRender(header.column.columnDef.header, header.getContext())}
															{{
																asc: <span className="text-[10px] text-black">▲</span>,
																desc: <span className="text-[10px] text-black">▼</span>,
															}[header.column.getIsSorted() as string] ?? null}
														</>
													)}
												</div>
												{header.column.getCanResize() && (
													// biome-ignore lint/a11y/noStaticElementInteractions: Resizer is handled by table library
													<div
														onMouseDown={header.getResizeHandler()}
														onTouchStart={header.getResizeHandler()}
														className={cn(
															"absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity",
															header.column.getIsResizing() ? "bg-blue-500 opacity-100" : "",
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
											"transition-colors hover:bg-gray-50 border-b-gray-100",
											row.getIsSelected() && "bg-gray-50/50",
										)}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} style={{ ...getPinningStyles(cell.column) }} className="py-3 bg-white">
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
									<TableCell colSpan={columns.length} className="h-32 text-center text-gray-500">
										暂无数据
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</table>
				)}
			</div>

			{pagination && onPageChange && onPageSizeChange && (
				<div className="border-t border-gray-100 bg-gray-50/30 rounded-b-xl">
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
