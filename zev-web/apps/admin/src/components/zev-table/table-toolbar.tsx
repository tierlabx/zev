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
import { Settings2 } from "lucide-react";

interface TableToolbarProps<TData> {
	table: Table<TData>;
	showColumnToggle?: boolean;
}

export function TableToolbar<TData>({ table, showColumnToggle = true }: TableToolbarProps<TData>) {
	if (!showColumnToggle) return null;

	return (
		<div className="flex items-center justify-between p-2">
			<div className="flex flex-1 items-center space-x-2">{/* 可以预留搜索或其他操作位 */}</div>
			<div className="flex items-center space-x-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
							<Settings2 className="mr-2 h-4 w-4" />
							视图
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[150px]">
						<DropdownMenuLabel>切换列显隐</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{table
							.getAllColumns()
							.filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
							.map((column) => {
								return (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) => column.toggleVisibility(!!value)}
									>
										{typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
									</DropdownMenuCheckboxItem>
								);
							})}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
