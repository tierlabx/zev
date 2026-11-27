import type { Table } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@zev/ui/components/dropdown-menu";
import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";

interface TableToolbarProps<TData> {
	table: Table<TData>;
	showColumnToggle?: boolean;
	left?: ReactNode;
	right?: ReactNode;
}

export function TableToolbar<TData>({ table, showColumnToggle = true, left, right }: TableToolbarProps<TData>) {
	const { t } = useI18n();
	const hideableColumns = table
		.getAllColumns()
		.filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide());
	const hasColumnToggle = showColumnToggle && hideableColumns.length > 0;

	if (!left && !right && !hasColumnToggle) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
			<div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">{left}</div>
			<div className="flex flex-wrap items-center gap-2 shrink-0">
				{hasColumnToggle ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="hidden h-8 lg:inline-flex">
								<SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
								{t("table.view")}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[150px]">
							<DropdownMenuLabel>{t("table.toggleColumns")}</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{hideableColumns.map((column) => (
								<DropdownMenuCheckboxItem
									key={column.id}
									className="capitalize"
									checked={column.getIsVisible()}
									onCheckedChange={(value) => column.toggleVisibility(!!value)}
								>
									{typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
				{right}
			</div>
		</div>
	);
}
