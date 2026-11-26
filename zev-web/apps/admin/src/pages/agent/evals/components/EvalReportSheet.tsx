import { useQuery } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@zev/ui/components/sheet";
import { getEvalRunDetail } from "@/api/agent";
import { useI18n } from "@/i18n";

interface EvalReportSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	evalRunId: number | null;
}

export function EvalReportSheet({ open, onOpenChange, evalRunId }: EvalReportSheetProps) {
	const { t } = useI18n();
	const { data, isLoading } = useQuery({
		queryKey: ["agentEvalRunDetail", evalRunId],
		queryFn: () => getEvalRunDetail(evalRunId as number),
		enabled: open && evalRunId !== null && evalRunId > 0,
		refetchInterval: (query) => (query.state.data?.run.status === "running" ? 2500 : false),
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 gap-0">
				<SheetHeader className="border-b px-6 py-4 text-left">
					<div className="flex items-center gap-2 pr-6">
						<SheetTitle className="text-base">
							{t("agent.evals.reportTitle")} #{evalRunId}
						</SheetTitle>
						{data?.run ? (
							data.run.status === "running" ? (
								<Badge variant="outline">{t("agent.evals.runningBadge")}</Badge>
							) : data.run.status === "failed" ? (
								<Badge variant="destructive">{t("agent.evals.failedBadge")}</Badge>
							) : (
								<Badge variant={data.run.gate_passed ? "secondary" : "destructive"}>
									{data.run.gate_passed ? t("agent.evals.gatePassed") : t("agent.evals.gateFailed")}
								</Badge>
							)
						) : null}
					</div>
					<SheetDescription className="text-xs">
						{data?.run
							? `${data.run.agent_name} · ${(data.run.pass_rate * 100).toFixed(1)}% (${data.run.passed_cases}/${data.run.total_cases}) · avg ${data.run.avg_latency_ms}ms · ${data.run.total_tokens} tokens`
							: t("common.loading")}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
					{data?.run.status === "running" ? (
						<div className="rounded-md border border-dashed bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
							{t("agent.evals.runningProgress", {
								done: data.results.length,
								total: data.run.total_cases,
							})}
						</div>
					) : null}
					{isLoading || !data ? (
						<div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
					) : (
						data.results.map((item) => (
							<div key={item.id} className="rounded-md border p-3.5 space-y-2 text-xs">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2 min-w-0">
										<Badge variant={item.passed ? "secondary" : "destructive"}>{item.passed ? "PASS" : "FAIL"}</Badge>
										<span className="font-medium truncate">{item.case_name}</span>
									</div>
									<span className="font-mono tabular-nums text-muted-foreground shrink-0">
										score {item.score.toFixed(2)} · {item.latency_ms}ms · {item.tokens} tok
									</span>
								</div>
								{item.assertion_detail ? <div className="text-muted-foreground">{item.assertion_detail}</div> : null}
								{item.judge_reason ? (
									<div className="rounded bg-muted/40 px-2.5 py-1.5 text-muted-foreground">
										Judge: {item.judge_reason}
									</div>
								) : null}
								<pre className="max-h-36 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
									{item.actual_output || "-"}
								</pre>
							</div>
						))
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
