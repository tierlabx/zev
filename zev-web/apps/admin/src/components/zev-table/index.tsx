import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";
import { cn } from "@zev/ui/lib/utils";
import { Loader2 } from "lucide-react";
import * as React from "react";

interface ZevTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	isLoading?: boolean;
	fetchNextPage?: () => void;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	className?: string;
	containerHeight?: string | number;
	onRowClick?: (row: TData) => void;
}

export function ZevTable<TData, TValue>({
	columns,
	data,
	isLoading,
	fetchNextPage,
	hasNextPage,
	isFetchingNextPage,
	className,
	containerHeight = "500px",
	onRowClick,
}: ZevTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const { rows } = table.getRowModel();

	const tableContainerRef = React.useRef<HTMLDivElement>(null);

	const rowVirtualizer = useVirtualizer({
		count: hasNextPage ? rows.length + 1 : rows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => 52, // 预计每行高度
		overscan: 5,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();

	const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
	const paddingBottom = virtualItems.length > 0 ? totalSize - (virtualItems?.[virtualItems.length - 1]?.end || 0) : 0;

	// Infinite scroll listener
	React.useEffect(() => {
		const [lastItem] = [...virtualItems].reverse();

		if (!lastItem) {
			return;
		}

		if (lastItem.index >= rows.length - 1 && hasNextPage && !isFetchingNextPage && fetchNextPage) {
			fetchNextPage();
		}
	}, [hasNextPage, fetchNextPage, rows.length, isFetchingNextPage, virtualItems]);

	if (isLoading && data.length === 0) {
		return (
			<div className="w-full flex items-center justify-center p-8 bg-white rounded-xl border border-gray-200">
				<Loader2 className="h-6 w-6 animate-spin text-[#1677FF]" />
				<span className="ml-2 text-sm text-gray-500">加载数据中...</span>
			</div>
		);
	}

	return (
		<div
			className={cn("relative w-full rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col", className)}
		>
			<div ref={tableContainerRef} className="w-full overflow-auto" style={{ height: containerHeight }}>
				<Table className="relative w-full">
					<TableHeader className="sticky top-0 z-20">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-gray-50/90 backdrop-blur-md">
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											colSpan={header.colSpan}
											style={{ width: header.getSize() }}
											onClick={header.column.getToggleSortingHandler()}
											className={cn(
												header.column.getCanSort() ? "cursor-pointer select-none" : "",
												"transition-colors hover:text-gray-900",
											)}
										>
											{header.isPlaceholder ? null : (
												<div className="flex items-center space-x-2">
													{flexRender(header.column.columnDef.header, header.getContext())}
													{{
														asc: <span className="text-[10px] text-blue-500">▲</span>,
														desc: <span className="text-[10px] text-blue-500">▼</span>,
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
						{virtualItems.map((virtualRow) => {
							const isLoaderRow = virtualRow.index > rows.length - 1;
							const row = rows[virtualRow.index];

							if (isLoaderRow) {
								return (
									<TableRow key={`loader-${virtualRow.index}`}>
										<TableCell colSpan={columns.length} className="h-[52px] text-center">
											<div className="flex items-center justify-center text-gray-400">
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
												加载更多...
											</div>
										</TableCell>
									</TableRow>
								);
							}

							return (
								<TableRow
									key={row.id}
									data-index={virtualRow.index}
									ref={rowVirtualizer.measureElement}
									onClick={() => onRowClick?.(row.original)}
									className={cn(onRowClick && "cursor-pointer")}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
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
								<TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
									暂无数据
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
