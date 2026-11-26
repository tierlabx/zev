import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@zev/ui/components/chart";
import { DeltaBadge } from "@zev/ui/components/delta-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@zev/ui/components/tabs";
import { Edit, Eye, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
	type AgentEvalCase,
	type AgentEvalDataset,
	deleteEvalCase,
	deleteEvalDataset,
	executeEvalRun,
	getEvalCases,
	getEvalDatasets,
	getEvalRuns,
} from "@/api/agent";
import { Auth } from "@/components/auth";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { CaseFormDialog } from "./components/CaseFormDialog";
import { DatasetFormDialog } from "./components/DatasetFormDialog";
import { EvalReportSheet } from "./components/EvalReportSheet";

export default function AgentEvalsPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();

	const [selectedDatasetId, setSelectedDatasetId] = useState<number>(0);
	const [datasetDialogOpen, setDatasetDialogOpen] = useState(false);
	const [editingDataset, setEditingDataset] = useState<AgentEvalDataset | null>(null);

	const [caseDialogOpen, setCaseDialogOpen] = useState(false);
	const [editingCase, setEditingCase] = useState<AgentEvalCase | null>(null);

	const [reportRunId, setReportRunId] = useState<number | null>(null);
	const [reportOpen, setReportOpen] = useState(false);

	const { data: datasetPage } = useQuery({
		queryKey: ["agentEvalDatasets"],
		queryFn: () => getEvalDatasets({ page: 1, pageSize: 50 }),
	});

	const datasets = datasetPage?.list ?? [];
	useEffect(() => {
		if (datasets.length > 0 && !datasets.some((d) => d.id === selectedDatasetId)) {
			setSelectedDatasetId(datasets[0].id);
		}
	}, [datasets, selectedDatasetId]);

	const selectedDataset = useMemo(
		() => datasets.find((d) => d.id === selectedDatasetId) ?? null,
		[datasets, selectedDatasetId],
	);

	const { data: cases = [] } = useQuery({
		queryKey: ["agentEvalCases", selectedDatasetId],
		queryFn: () => getEvalCases(selectedDatasetId),
		enabled: selectedDatasetId > 0,
	});

	const { data: evalRunPage } = useQuery({
		queryKey: ["agentEvalRuns", selectedDatasetId],
		queryFn: () => getEvalRuns({ page: 1, pageSize: 20, datasetId: selectedDatasetId }),
		enabled: selectedDatasetId > 0,
		refetchInterval: (query) => ((query.state.data?.list ?? []).some((r) => r.status === "running") ? 2500 : false),
	});

	const hadRunningRef = useRef(false);
	useEffect(() => {
		const hasRunning = (evalRunPage?.list ?? []).some((r) => r.status === "running");
		if (hadRunningRef.current && !hasRunning) {
			queryClient.invalidateQueries({ queryKey: ["agentEvalDatasets"] });
		}
		hadRunningRef.current = hasRunning;
	}, [evalRunPage, queryClient]);

	const deleteDatasetMutation = useMutation({
		mutationFn: deleteEvalDataset,
		onSuccess: () => {
			toast.success(t("agent.common.deleteSuccess"));
			queryClient.invalidateQueries({ queryKey: ["agentEvalDatasets"] });
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const deleteCaseMutation = useMutation({
		mutationFn: deleteEvalCase,
		onSuccess: () => {
			toast.success(t("agent.common.deleteSuccess"));
			queryClient.invalidateQueries({ queryKey: ["agentEvalCases", selectedDatasetId] });
			queryClient.invalidateQueries({ queryKey: ["agentEvalDatasets"] });
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const executeMutation = useMutation({
		mutationFn: (datasetId: number) => executeEvalRun(datasetId),
		onSuccess: (detail) => {
			toast.success(t("agent.evals.runStartedToast"));
			queryClient.invalidateQueries({ queryKey: ["agentEvalDatasets"] });
			queryClient.invalidateQueries({ queryKey: ["agentEvalRuns", selectedDatasetId] });
			setReportRunId(detail.run.id);
			setReportOpen(true);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const chartData = useMemo(() => {
		const runs = [...(evalRunPage?.list ?? [])].filter((r) => r.status === "completed").reverse();
		return runs.map((r) => ({
			label: `#${r.id}`,
			passRate: Number((r.pass_rate * 100).toFixed(1)),
		}));
	}, [evalRunPage]);

	const chartConfig = useMemo<ChartConfig>(
		() => ({
			passRate: {
				label: t("agent.evals.passRate"),
				color: "var(--color-primary)",
			},
		}),
		[t],
	);

	return (
		<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
			{/* 左侧：评测数据集列表与门禁状态 */}
			<Card className="lg:col-span-4 flex flex-col p-4 min-h-0 space-y-3">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-muted-foreground">
						{t("agent.evals.datasets")} ({datasets.length})
					</span>
					<Auth permission="agent:evals:manage">
						<Button
							size="sm"
							onClick={() => {
								setEditingDataset(null);
								setDatasetDialogOpen(true);
							}}
						>
							<Plus className="mr-1 h-3.5 w-3.5" />
							{t("agent.evals.addDataset")}
						</Button>
					</Auth>
				</div>

				<div className="flex-1 overflow-y-auto space-y-2 pr-1">
					{datasets.length === 0 ? (
						<div className="py-10 text-center text-xs text-muted-foreground">{t("common.noData")}</div>
					) : (
						datasets.map((ds) => {
							const active = ds.id === selectedDatasetId;
							return (
								<div
									key={ds.id}
									className={`rounded-md border p-3 space-y-2 transition-colors ${
										active ? "border-foreground/40 bg-muted/50" : "hover:bg-muted/20"
									}`}
								>
									<div className="flex items-start justify-between gap-2">
										<button
											type="button"
											onClick={() => setSelectedDatasetId(ds.id)}
											className="min-w-0 flex-1 text-left cursor-pointer"
										>
											<div className="text-sm font-medium truncate">{ds.name}</div>
											<div className="text-[11px] text-muted-foreground truncate">
												{ds.agent_name} · {ds.case_count} cases · gate ≥ {(ds.pass_threshold * 100).toFixed(0)}%
											</div>
										</button>
										<div className="flex items-center gap-0.5 shrink-0">
											<Auth permission="agent:evals:manage">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													onClick={(e) => {
														e.stopPropagation();
														setEditingDataset(ds);
														setDatasetDialogOpen(true);
													}}
												>
													<Edit className="h-3.5 w-3.5" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-destructive"
													onClick={(e) => {
														e.stopPropagation();
														confirm(t("agent.evals.deleteDatasetConfirm", { name: ds.name }), () =>
															deleteDatasetMutation.mutate(ds.id),
														);
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</Auth>
										</div>
									</div>

									<div className="flex items-center justify-between gap-2 pt-1">
										<div className="flex items-center gap-1.5">
											{ds.latest_pass_rate !== null && ds.latest_pass_rate !== undefined ? (
												<>
													<span className="text-xs font-mono font-semibold tabular-nums">
														{(ds.latest_pass_rate * 100).toFixed(1)}%
													</span>
													<Badge variant={ds.latest_gate_pass ? "secondary" : "destructive"} className="text-[10px]">
														{ds.latest_gate_pass ? t("agent.evals.gatePassed") : t("agent.evals.gateFailed")}
													</Badge>
												</>
											) : (
												<span className="text-[11px] text-muted-foreground">{t("agent.evals.notRunYet")}</span>
											)}
										</div>
										{ds.pass_rate_delta !== null && ds.pass_rate_delta !== undefined ? (
											<DeltaBadge value={ds.pass_rate_delta} />
										) : null}
									</div>
								</div>
							);
						})
					)}
				</div>
			</Card>

			{/* 右侧：回归趋势曲线 + 用例与报告管理 */}
			<div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
				{selectedDataset ? (
					<>
						<Card className="p-4 space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="text-xs text-muted-foreground">
									{selectedDataset.name} · {t("agent.evals.trendLabel")}
								</div>
								<Auth permission="agent:evals:run">
									<Button
										size="sm"
										disabled={executeMutation.isPending || cases.length === 0}
										onClick={() => executeMutation.mutate(selectedDataset.id)}
									>
										<Play className="mr-1.5 h-3.5 w-3.5" />
										{executeMutation.isPending ? t("agent.evals.running") : t("agent.evals.runNow")}
									</Button>
								</Auth>
							</div>
							{chartData.length > 0 ? (
								<ChartContainer config={chartConfig} className="h-44 w-full">
									<AreaChart data={chartData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
										<YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} unit="%" />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Area
											type="monotone"
											dataKey="passRate"
											stroke="var(--color-passRate)"
											fill="var(--color-passRate)"
											fillOpacity={0.14}
											strokeWidth={2}
										/>
									</AreaChart>
								</ChartContainer>
							) : (
								<div className="h-32 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">
									{t("agent.evals.noTrendData")}
								</div>
							)}
						</Card>

						<Card className="flex-1 flex flex-col p-4 min-h-0">
							<Tabs defaultValue="cases" className="flex-1 flex flex-col min-h-0">
								<div className="flex items-center justify-between gap-2 mb-3">
									<TabsList>
										<TabsTrigger value="cases">
											{t("agent.evals.tabCases")} ({cases.length})
										</TabsTrigger>
										<TabsTrigger value="runs">
											{t("agent.evals.tabRuns")} ({evalRunPage?.total ?? 0})
										</TabsTrigger>
									</TabsList>
									<Auth permission="agent:evals:manage">
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												setEditingCase(null);
												setCaseDialogOpen(true);
											}}
										>
											<Plus className="mr-1 h-3.5 w-3.5" />
											{t("agent.evals.addCase")}
										</Button>
									</Auth>
								</div>

								<TabsContent value="cases" className="flex-1 overflow-y-auto mt-0 space-y-2 pr-1">
									{cases.length === 0 ? (
										<div className="py-10 text-center text-xs text-muted-foreground">{t("common.noData")}</div>
									) : (
										cases.map((c) => (
											<div key={c.id} className="rounded-md border p-3 flex items-start justify-between gap-3 text-xs">
												<div className="space-y-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="font-medium">{c.name}</span>
														{c.tags ? (
															<Badge variant="outline" className="text-[10px]">
																{c.tags}
															</Badge>
														) : null}
													</div>
													<div className="text-muted-foreground line-clamp-2">{c.input}</div>
													<div className="flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
														{c.expected_pattern ? <span>regex: {c.expected_pattern}</span> : null}
														{c.expected_json_schema ? <span>json-schema</span> : null}
														{c.judge_criteria ? <span>llm-judge</span> : null}
													</div>
												</div>
												<Auth permission="agent:evals:manage">
													<div className="flex items-center gap-1 shrink-0">
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7"
															onClick={() => {
																setEditingCase(c);
																setCaseDialogOpen(true);
															}}
														>
															<Edit className="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-destructive"
															onClick={() =>
																confirm(t("agent.evals.deleteCaseConfirm", { name: c.name }), () =>
																	deleteCaseMutation.mutate(c.id),
																)
															}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</Auth>
											</div>
										))
									)}
								</TabsContent>

								<TabsContent value="runs" className="flex-1 overflow-y-auto mt-0 space-y-2 pr-1">
									{(evalRunPage?.list ?? []).length === 0 ? (
										<div className="py-10 text-center text-xs text-muted-foreground">{t("common.noData")}</div>
									) : (
										(evalRunPage?.list ?? []).map((run) => (
											<div
												key={run.id}
												className="rounded-md border p-3 flex items-center justify-between gap-3 text-xs"
											>
												<div className="space-y-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="font-mono font-medium">#{run.id}</span>
														{run.status === "running" ? (
															<Badge variant="outline">{t("agent.evals.runningBadge")}</Badge>
														) : run.status === "failed" ? (
															<Badge variant="destructive">{t("agent.evals.failedBadge")}</Badge>
														) : (
															<Badge variant={run.gate_passed ? "secondary" : "destructive"}>
																{run.gate_passed ? t("agent.evals.gatePassed") : t("agent.evals.gateFailed")}
															</Badge>
														)}
														<span className="font-mono tabular-nums font-medium">
															{(run.pass_rate * 100).toFixed(1)}% ({run.passed_cases}/{run.total_cases})
														</span>
													</div>
													<div className="text-[11px] text-muted-foreground tabular-nums">
														{new Date(run.created_at).toLocaleString()} · avg {run.avg_latency_ms}ms ·{" "}
														{run.total_tokens} tokens
													</div>
												</div>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setReportRunId(run.id);
														setReportOpen(true);
													}}
												>
													<Eye className="mr-1 h-3.5 w-3.5" />
													{t("agent.evals.viewReport")}
												</Button>
											</div>
										))
									)}
								</TabsContent>
							</Tabs>
						</Card>
					</>
				) : (
					<Card className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
						{t("agent.evals.selectDatasetHint")}
					</Card>
				)}
			</div>

			<DatasetFormDialog
				open={datasetDialogOpen}
				onOpenChange={setDatasetDialogOpen}
				editing={editingDataset}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["agentEvalDatasets"] })}
			/>
			{selectedDatasetId > 0 ? (
				<CaseFormDialog
					open={caseDialogOpen}
					onOpenChange={setCaseDialogOpen}
					datasetId={selectedDatasetId}
					editing={editingCase}
					onSuccess={() => {
						queryClient.invalidateQueries({ queryKey: ["agentEvalCases", selectedDatasetId] });
						queryClient.invalidateQueries({ queryKey: ["agentEvalDatasets"] });
					}}
				/>
			) : null}
			<EvalReportSheet open={reportOpen} onOpenChange={setReportOpen} evalRunId={reportRunId} />
			<ConfirmDialog />
		</div>
	);
}
