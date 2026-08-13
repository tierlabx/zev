import type { ColumnDef, RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		fixed?: "left" | "right";
	}
}

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
