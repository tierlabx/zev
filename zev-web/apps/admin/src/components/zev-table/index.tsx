import * as React from "react";
import {
	type ColumnDef,
	type SortingState,
	type VisibilityState,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";
import { cn } from "@zev/ui/lib/utils";
import { motion, type Variants } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Pagination } from "./pagination";
import { TableToolbar } from "./table-toolbar";

const MotionTableRow = motion.create(TableRow);

const rowVariants: Variants = {
	hidden: { opacity: 0, y: 15 },
	visible: (idx: number) => ({
		opacity: 1,
		y: 0,
		transition: {
			delay: idx * 0.04,
			duration: 0.3,
			ease: "easeOut",
		},
	}),
};

export interface ZevTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	isLoading?: boolean;

	// 分页相关
	pagination?: boolean;
	page?: number;
	pageSize?: number;
	total?: number;
	onPageChange?: (page: number) => void;
	onPageSizeChange?: (pageSize: number) => void;

	// 行选择相关
	enableRowSelection?: boolean;
	onSelectionChange?: (selectedRows: TData[]) => void;

	// 样式与配置
	className?: string;
	containerHeight?: string | number;
	showToolbar?: boolean;
	onRowClick?: (row: TData) => void;
}

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
	containerHeight = "500px",
	showToolbar = true,
	onRowClick,
}: ZevTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
		},
		enableRowSelection,
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
	}, [rowSelection, table, onSelectionChange]);

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
		>
			{showToolbar && <TableToolbar table={table} />}

			<div ref={tableContainerRef} className="w-full overflow-auto relative" style={{ height: containerHeight }}>
				{isLoading && data.length === 0 && (
					<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
						<div className="flex flex-col items-center justify-center space-y-2 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
							<Loader2 className="h-6 w-6 animate-spin text-black" />
							<span className="text-sm text-gray-500">正在加载数据...</span>
						</div>
					</div>
				)}

				<Table className="relative w-full">
					<TableHeader className="sticky top-0 z-20">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-gray-50/90 backdrop-blur-md border-b-gray-200">
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											colSpan={header.colSpan}
											style={{ width: header.getSize() }}
											onClick={header.column.getToggleSortingHandler()}
											className={cn(
												header.column.getCanSort() ? "cursor-pointer select-none" : "",
												"transition-colors hover:text-gray-900 text-gray-600 font-medium",
											)}
										>
											{header.isPlaceholder ? null : (
												<div className="flex items-center space-x-2">
													{flexRender(header.column.columnDef.header, header.getContext())}
													{{
														asc: <span className="text-[10px] text-black">▲</span>,
														desc: <span className="text-[10px] text-black">▼</span>,
													}[header.column.getIsSorted() as string] ?? null}
												</div>
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

						{virtualItems.map((virtualRow, idx) => {
							const row = rows[virtualRow.index];
							// 尝试获取唯一标识作为 key，如果没有则回退到 row.id
							const rowKey = (row.original as any).ID || (row.original as any).id || row.id;
							
							return (
								<MotionTableRow
									key={rowKey}
									custom={idx}
									initial="hidden"
									animate="visible"
									variants={rowVariants}
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
										<TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="py-3">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</MotionTableRow>
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
				</Table>
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
