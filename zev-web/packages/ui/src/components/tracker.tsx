import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@zev/ui/components/tooltip";
import { cn } from "@zev/ui/lib/utils";
import * as React from "react";

export type TrackerStatus = "operational" | "degraded" | "down" | "idle";

export interface TrackerItem {
	key?: string | number;
	status?: TrackerStatus;
	tooltip?: string;
}

const statusClassMap: Record<TrackerStatus, string> = {
	operational: "bg-emerald-500/90 hover:bg-emerald-500",
	degraded: "bg-amber-500/90 hover:bg-amber-500",
	down: "bg-destructive/90 hover:bg-destructive",
	idle: "bg-muted-foreground/20 hover:bg-muted-foreground/35",
};

interface TrackerProps extends React.HTMLAttributes<HTMLDivElement> {
	data: TrackerItem[];
}

export const Tracker = React.forwardRef<HTMLDivElement, TrackerProps>(({ data, className, ...props }, ref) => {
	return (
		<TooltipProvider delayDuration={120}>
			<div ref={ref} className={cn("flex h-7 w-full items-center gap-[3px]", className)} {...props}>
				{data.map((item, idx) => {
					const status = item.status ?? "idle";
					const bar = (
						<span
							className={cn(
								"h-full flex-1 rounded-[3px] transition-colors duration-150 first:rounded-l-md last:rounded-r-md",
								statusClassMap[status],
							)}
						/>
					);

					if (!item.tooltip) {
						return (
							<React.Fragment key={item.key ?? idx}>
								{bar}
							</React.Fragment>
						);
					}

					return (
						<Tooltip key={item.key ?? idx}>
							<TooltipTrigger asChild>{bar}</TooltipTrigger>
							<TooltipContent className="text-[11px] font-medium tabular-nums">{item.tooltip}</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</TooltipProvider>
	);
});
Tracker.displayName = "Tracker";
