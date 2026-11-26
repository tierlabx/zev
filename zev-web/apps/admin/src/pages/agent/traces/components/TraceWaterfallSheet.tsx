import { useQuery } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@zev/ui/components/sheet";
import { useMemo, useState } from "react";
import { type AgentRunSpan, getRunDetail } from "@/api/agent";
import { useI18n } from "@/i18n";
import { formatJsonString } from "@/utils/download";

interface TraceWaterfallSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	runId: number | null;
}

const SPAN_BAR_COLORS: Record<AgentRunSpan["span_type"], string> = {
	llm: "bg-foreground",
	tool: "bg-foreground/70",
	guardrail: "bg-muted-foreground",
	approval: "bg-amber-500",
	system: "bg-muted-foreground/60",
};

export function TraceWaterfallSheet({ open, onOpenChange, runId }: TraceWaterfallSheetProps) {
	const { t } = useI18n();
	const [selectedSpanId, setSelectedSpanId] = useState<number | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["agentRunDetail", runId],
		queryFn: () => getRunDetail(runId as number),
		enabled: open && runId !== null && runId > 0,
	});

	const { baseStartMs, totalDurationMs } = useMemo(() => {
		const spans = data?.spans ?? [];
		if (spans.length === 0) {
			return { baseStartMs: 0, totalDurationMs: Math.max(data?.run.duration_ms ?? 1, 1) };
		}
		const starts = spans.map((sp) => new Date(sp.started_at).getTime());
		const minStart = Math.min(...starts);
		const maxEnd = Math.max(
			...spans.map((sp) =>
				sp.ended_at ? new Date(sp.ended_at).getTime() : new Date(sp.started_at).getTime() + Math.max(sp.duration_ms, 1),
			),
		);
		return {
			baseStartMs: minStart,
			totalDurationMs: Math.max(maxEnd - minStart, data?.run.duration_ms ?? 1, 1),
		};
	}, [data]);

	const activeSpan = useMemo(() => {
		const spans = data?.spans ?? [];
		if (spans.length === 0) return null;
		return spans.find((s) => s.id === selectedSpanId) ?? spans[0];
	}, [data, selectedSpanId]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 gap-0">
				<SheetHeader className="border-b px-6 py-4 text-left">
					<div className="flex items-center gap-2 pr-6">
						<SheetTitle className="text-base">
							{t("agent.traces.detailTitle")} #{runId}
						</SheetTitle>
						{data?.run ? (
							<Badge variant={data.run.status === "failed" ? "destructive" : "secondary"}>{data.run.status}</Badge>
						) : null}
					</div>
					<SheetDescription className="text-xs">
						{data?.run
							? `${data.run.agent_name} · ${data.run.model} · ${data.run.step_count} steps · ${data.run.total_tokens} tokens · ${data.run.duration_ms}ms`
							: t("common.loading")}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
					{isLoading || !data ? (
						<div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
					) : (
						<>
							{/* 概览摘要 */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border bg-card p-3.5 text-xs">
								<div className="space-y-1">
									<div className="text-muted-foreground">{t("agent.traces.inputSummary")}</div>
									<div className="text-foreground break-words">{data.run.input_summary || "-"}</div>
								</div>
								<div className="space-y-1">
									<div className="text-muted-foreground">{t("agent.traces.outputSummary")}</div>
									<div className="text-foreground break-words">
										{data.run.output_summary || data.run.error_message || "-"}
									</div>
								</div>
							</div>

							{/* Span 瀑布时间轴 */}
							<div className="space-y-2">
								<div className="text-xs font-medium text-muted-foreground">
									{t("agent.traces.waterfallTitle")} ({data.spans.length})
								</div>
								<div className="rounded-md border divide-y">
									{data.spans.map((sp) => {
										const startOffset = Math.max(0, new Date(sp.started_at).getTime() - baseStartMs);
										const leftPct = Math.min(96, (startOffset / totalDurationMs) * 100);
										const widthPct = Math.max(
											2,
											Math.min(100 - leftPct, (Math.max(sp.duration_ms, 1) / totalDurationMs) * 100),
										);
										const selected = activeSpan?.id === sp.id;
										const barColor =
											sp.status === "error" || sp.status === "blocked"
												? "bg-destructive"
												: SPAN_BAR_COLORS[sp.span_type];

										return (
											<button
												key={sp.id}
												type="button"
												onClick={() => setSelectedSpanId(sp.id)}
												className={`w-full px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
													selected ? "bg-muted/70" : "hover:bg-muted/30"
												}`}
											>
												<div className="grid grid-cols-12 items-center gap-2">
													<div className="col-span-5 flex items-center gap-1.5 min-w-0">
														<Badge variant="outline" className="text-[10px] uppercase shrink-0">
															{sp.span_type}
														</Badge>
														<span className="font-mono truncate">{sp.name}</span>
													</div>
													<div className="col-span-5 relative h-3 rounded bg-muted overflow-hidden">
														<div
															className={`absolute top-0 bottom-0 rounded ${barColor}`}
															style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
														/>
													</div>
													<div className="col-span-2 text-right font-mono tabular-nums text-[11px] text-muted-foreground">
														{sp.duration_ms}ms
													</div>
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* 选中 Span 载荷明细 */}
							{activeSpan ? (
								<div className="space-y-3 rounded-md border p-4 text-xs">
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<span className="font-mono font-medium">{activeSpan.name}</span>
											<Badge
												variant={
													activeSpan.status === "error" || activeSpan.status === "blocked" ? "destructive" : "secondary"
												}
											>
												{activeSpan.status}
											</Badge>
										</div>
										<span className="text-muted-foreground tabular-nums">
											{activeSpan.duration_ms}ms · {activeSpan.tokens} tokens
										</span>
									</div>

									{activeSpan.error_message ? (
										<div className="rounded border border-destructive/30 bg-destructive/5 p-2.5 text-destructive">
											{activeSpan.error_message}
										</div>
									) : null}

									<div className="space-y-1">
										<div className="text-[11px] text-muted-foreground">Input Payload (Sanitized)</div>
										<pre className="max-h-44 overflow-auto rounded border bg-muted/40 p-2.5 font-mono text-[11px] whitespace-pre-wrap break-all">
											{formatJsonString(activeSpan.input_json) || "-"}
										</pre>
									</div>

									<div className="space-y-1">
										<div className="text-[11px] text-muted-foreground">Output Payload (Sanitized)</div>
										<pre className="max-h-52 overflow-auto rounded border bg-muted/40 p-2.5 font-mono text-[11px] whitespace-pre-wrap break-all">
											{formatJsonString(activeSpan.output_json) || "-"}
										</pre>
									</div>
								</div>
							) : null}
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
