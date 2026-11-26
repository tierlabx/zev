import { Badge } from "@zev/ui/components/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@zev/ui/components/collapsible";
import { ChevronDown, Wrench } from "lucide-react";
import { useState } from "react";
import { formatJsonString } from "@/utils/download";

export interface PlaygroundToolStep {
	id: string;
	toolName: string;
	arguments: string;
	result?: string;
	status: "running" | "done" | "blocked" | "waiting_approval";
}

interface ToolCallCardProps {
	step: PlaygroundToolStep;
}

export function ToolCallCard({ step }: ToolCallCardProps) {
	const [open, setOpen] = useState(false);

	const statusLabel =
		step.status === "waiting_approval"
			? "等待审批"
			: step.status === "blocked"
				? "已拦截"
				: step.status === "running"
					? "执行中"
					: "已完成";

	return (
		<Collapsible open={open} onOpenChange={setOpen} className="rounded-md border bg-muted/30">
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors cursor-pointer"
				>
					<div className="flex items-center gap-2 min-w-0">
						<Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						<span className="font-mono font-medium truncate">{step.toolName}</span>
						<Badge
							variant={
								step.status === "blocked" ? "destructive" : step.status === "waiting_approval" ? "default" : "outline"
							}
							className="text-[10px]"
						>
							{statusLabel}
						</Badge>
					</div>
					<ChevronDown
						className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
					/>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent className="border-t px-3 py-2.5 space-y-2 text-xs">
				<div className="space-y-1">
					<div className="text-[11px] text-muted-foreground">Arguments</div>
					<pre className="max-h-36 overflow-auto rounded bg-background p-2 font-mono text-[11px] whitespace-pre-wrap break-all border">
						{formatJsonString(step.arguments) || "{}"}
					</pre>
				</div>
				{step.result !== undefined ? (
					<div className="space-y-1">
						<div className="text-[11px] text-muted-foreground">Result</div>
						<pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono text-[11px] whitespace-pre-wrap break-all border">
							{formatJsonString(step.result) || step.result}
						</pre>
					</div>
				) : null}
			</CollapsibleContent>
		</Collapsible>
	);
}
