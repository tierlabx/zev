import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Tracker, type TrackerItem, type TrackerStatus } from "@zev/ui/components/tracker";
import { Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { type AgentRun, getAgentOptions, getRunHeartbeats, getRunList } from "@/api/agent";
import { ZevTable } from "@/components/zev-table";
import { useI18n } from "@/i18n";
import { TraceWaterfallSheet } from "./components/TraceWaterfallSheet";

function mapRunTrackerStatus(status: AgentRun["status"]): TrackerStatus {
	if (status === "completed") return "operational";
	if (status === "failed") return "down";
	if (status === "waiting_approval" || status === "running") return "degraded";
	return "idle";
}

export default function AgentTracesPage() {
	const { t } = useI18n();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [keyword, setKeyword] = useState("");
	const [agentId, setAgentId] = useState("all");
	const [status, setStatus] = useState("all");
	const [debouncedKeyword] = useDebounce(keyword, 300);

	const [detailRunId, setDetailRunId] = useState<number | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	const { data: agents = [] } = useQuery({
		queryKey: ["agentOptions"],
		queryFn: getAgentOptions,
	});

	const { data: heartbeats = [] } = useQuery({
		queryKey: ["agentRunHeartbeats"],
		queryFn: getRunHeartbeats,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["agentRuns", page, pageSize, debouncedKeyword, agentId, status],
		queryFn: () =>
			getRunList({
				page,
				pageSize,
				keyword: debouncedKeyword,
				agentId: agentId === "all" ? undefined : Number(agentId),
				status: status === "all" ? undefined : status,
			}),
	});

	const trackerItems = useMemo<TrackerItem[]>(
		() =>
			heartbeats.map((hb) => ({
				key: String(hb.run_id),
				status: mapRunTrackerStatus(hb.status),
				tooltip: `#${hb.run_id} ${hb.agent_name} · ${hb.status} · ${hb.duration_ms}ms`,
			})),
		[heartbeats],
	);

	const successRate = useMemo(() => {
		if (heartbeats.length === 0) return "100.0";
		const ok = heartbeats.filter((h) => h.status === "completed").length;
		return ((ok / heartbeats.length) * 100).toFixed(1);
	}, [heartbeats]);

	const columns = useMemo<ColumnDef<AgentRun>[]>(
		() => [
			{
				accessorKey: "id",
				header: "Run ID",
				size: 80,
				cell: ({ row }) => <span className="font-mono text-xs tabular-nums">#{row.original.id}</span>,
			},
			{
				accessorKey: "agent_name",
				header: t("agent.workspace.name"),
				size: 160,
				cell: ({ row }) => (
					<div className="min-w-0">
						<div className="font-medium truncate">{row.original.agent_name}</div>
						<div className="font-mono text-[11px] text-muted-foreground truncate">{row.original.model}</div>
					</div>
				),
			},
			{
				accessorKey: "input_summary",
				header: t("agent.traces.inputSummary"),
				size: 260,
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground truncate block" title={row.original.input_summary}>
						{row.original.input_summary || "-"}
					</span>
				),
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				size: 120,
				cell: ({ row }) => (
					<Badge
						variant={
							row.original.status === "failed"
								? "destructive"
								: row.original.status === "completed"
									? "secondary"
									: "outline"
						}
					>
						{row.original.status}
					</Badge>
				),
			},
			{
				id: "metrics",
				header: t("agent.traces.metrics"),
				size: 160,
				cell: ({ row }) => (
					<span className="font-mono text-xs tabular-nums text-muted-foreground">
						{row.original.step_count} steps · {row.original.total_tokens} tok · {row.original.duration_ms}ms
					</span>
				),
			},
			{
				accessorKey: "created_at",
				header: t("common.createdAt"),
				size: 160,
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground tabular-nums">
						{new Date(row.original.created_at).toLocaleString()}
					</span>
				),
			},
			{
				id: "actions",
				header: t("common.actions"),
				size: 80,
				meta: { fixed: "right" },
				cell: ({ row }) => (
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						title={t("agent.traces.viewWaterfall")}
						onClick={() => {
							setDetailRunId(row.original.id);
							setSheetOpen(true);
						}}
					>
						<Eye className="h-4 w-4" />
					</Button>
				),
			},
		],
		[t],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
			{/* 近期执行心跳条 */}
			<Card className="p-4 space-y-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">{t("agent.traces.heartbeatLabel")}</span>
					<span className="font-medium tabular-nums">
						{t("agent.traces.successRate", { rate: successRate })} ({heartbeats.length})
					</span>
				</div>
				{trackerItems.length > 0 ? (
					<Tracker data={trackerItems} />
				) : (
					<div className="h-7 rounded bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
						{t("common.noData")}
					</div>
				)}
			</Card>

			<div className="flex flex-wrap items-center gap-2">
				<Input
					value={keyword}
					onChange={(e) => {
						setKeyword(e.target.value);
						setPage(1);
					}}
					placeholder={t("agent.traces.searchPlaceholder")}
					className="w-60"
				/>
				<Select
					value={agentId}
					onValueChange={(val) => {
						setAgentId(val);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("agent.traces.allAgents")}</SelectItem>
						{agents.map((a) => (
							<SelectItem key={a.id} value={String(a.id)}>
								{a.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={status}
					onValueChange={(val) => {
						setStatus(val);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("agent.traces.allStatus")}</SelectItem>
						<SelectItem value="completed">completed</SelectItem>
						<SelectItem value="failed">failed</SelectItem>
						<SelectItem value="waiting_approval">waiting_approval</SelectItem>
						<SelectItem value="cancelled">cancelled</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<Card className="flex-1 flex flex-col p-4 min-h-0">
				<ZevTable
					className="flex-1 min-h-0"
					columns={columns}
					data={data?.list || []}
					isLoading={isLoading}
					pagination={true}
					page={page}
					pageSize={pageSize}
					total={data?.total || 0}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
				/>
			</Card>

			<TraceWaterfallSheet open={sheetOpen} onOpenChange={setSheetOpen} runId={detailRunId} />
		</div>
	);
}
