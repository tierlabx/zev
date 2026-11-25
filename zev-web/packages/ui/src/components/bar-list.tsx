import { cn } from "@zev/ui/lib/utils";
import * as React from "react";

export interface BarListItem {
	key?: string | number;
	name: string;
	value: number;
	icon?: React.ReactNode;
}

interface BarListProps extends React.HTMLAttributes<HTMLDivElement> {
	data: BarListItem[];
	valueFormatter?: (value: number) => string;
}

export const BarList = React.forwardRef<HTMLDivElement, BarListProps>(
	({ data, valueFormatter = (v) => v.toLocaleString(), className, ...props }, ref) => {
		const maxValue = React.useMemo(() => Math.max(...data.map((item) => item.value), 0), [data]);

		return (
			<div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
				{data.map((item, idx) => {
					const widthPercent = maxValue > 0 ? Math.max((item.value / maxValue) * 100, 4) : 0;
					return (
						<div key={item.key ?? item.name ?? idx} className="flex items-center justify-between gap-3">
							<div className="relative flex h-8 flex-1 items-center overflow-hidden rounded-md bg-muted/40">
								<div
									className="absolute inset-y-0 left-0 rounded-md bg-primary/15 dark:bg-primary/25 transition-[width] duration-300"
									style={{ width: `${widthPercent}%` }}
								/>
								<div className="relative z-10 flex items-center gap-2 px-2.5 text-xs font-medium text-foreground truncate">
									{item.icon}
									<span className="truncate">{item.name}</span>
								</div>
							</div>
							<span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground min-w-[3.25rem] text-right">
								{valueFormatter(item.value)}
							</span>
						</div>
					);
				})}
			</div>
		);
	},
);
BarList.displayName = "BarList";
