import type { ColumnDef, Table } from "@tanstack/react-table";
import { Skeleton } from "@zev/ui/components/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";

interface TableSkeletonProps<TData, TValue> {
	table: Table<TData>;
	columns: ColumnDef<TData, TValue>[];
	pageSize?: number;
}

export function ZevTableSkeleton<TData, TValue>({ table, columns, pageSize = 10 }: TableSkeletonProps<TData, TValue>) {
	return (
		<table
			className="min-w-full caption-bottom text-sm relative"
			style={{ tableLayout: "fixed", width: table.getTotalSize() || "100%" }}
		>
			<TableHeader className="sticky top-0 z-20">
				<TableRow className="bg-card border-b border-border hover:bg-card">
					{columns.map((_, idx) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Static array for skeleton loading
						<TableHead key={idx} className="h-10 px-3 font-medium text-muted-foreground">
							<Skeleton className="h-4 w-20" />
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: pageSize }).map((_, idx) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static array for skeleton loading
					<TableRow key={idx} className="border-border">
						{columns.map((_, colIdx) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static array for skeleton loading
							<TableCell key={colIdx} className="px-3 py-2.5">
								<Skeleton className="h-4 w-full max-w-[120px]" />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</table>
	);
}
