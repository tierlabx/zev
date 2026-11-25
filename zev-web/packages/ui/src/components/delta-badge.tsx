import { cn } from "@zev/ui/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type * as React from "react";

interface DeltaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	value: number | null;
	label?: string;
}

export function DeltaBadge({ value, label, className, ...props }: DeltaBadgeProps) {
	if (value === null || Number.isNaN(value)) {
		return (
			<span
				className={cn(
					"inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums",
					className,
				)}
				{...props}
			>
				<span>—</span>
				{label ? <span className="font-normal">{label}</span> : null}
			</span>
		);
	}

	const isPositive = value > 0;
	const isNegative = value < 0;
	const formatted = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
				isPositive && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
				isNegative && "bg-destructive/15 text-destructive",
				!isPositive && !isNegative && "bg-muted text-muted-foreground",
				className,
			)}
			{...props}
		>
			{isPositive ? (
				<TrendingUp className="h-3 w-3 shrink-0" />
			) : isNegative ? (
				<TrendingDown className="h-3 w-3 shrink-0" />
			) : (
				<Minus className="h-3 w-3 shrink-0" />
			)}
			<span>{formatted}</span>
			{label ? <span className="font-normal opacity-80">{label}</span> : null}
		</span>
	);
}
