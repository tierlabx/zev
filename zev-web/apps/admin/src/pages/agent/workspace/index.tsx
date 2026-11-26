import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Edit, Play, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { type AgentDefinition, deleteAgent, getAgentList } from "@/api/agent";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { AgentFormDialog } from "./components/AgentFormDialog";

export default function AgentWorkspacePage() {
	const { t } = useI18n();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword] = useDebounce(keyword, 300);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<AgentDefinition | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["agentDefinitions", page, pageSize, debouncedKeyword],
		queryFn: () => getAgentList({ page, pageSize, keyword: debouncedKeyword }),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteAgent,
		onSuccess: () => {
			toast.success(t("agent.common.deleteSuccess"));
			queryClient.invalidateQueries({ queryKey: ["agentDefinitions"] });
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const handleDelete = useCallback(
		(item: AgentDefinition) => {
			confirm(t("agent.workspace.deleteConfirm", { name: item.name }), () => {
				deleteMutation.mutate(item.id);
			});
		},
		[confirm, deleteMutation, t],
	);

	const columns = useMemo<ColumnDef<AgentDefinition>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("agent.workspace.name"),
				size: 180,
				cell: ({ row }) => (
					<div className="min-w-0">
						<div className="font-medium truncate">{row.original.name}</div>
						<div className="font-mono text-[11px] text-muted-foreground truncate">{row.original.code}</div>
					</div>
				),
			},
			{
				accessorKey: "model",
				header: t("agent.workspace.model"),
				size: 180,
				cell: ({ row }) => (
					<div className="min-w-0">
						<div className="font-mono text-xs truncate">{row.original.model}</div>
						<div className="text-[11px] text-muted-foreground truncate">{row.original.provider_name}</div>
					</div>
				),
			},
			{
				id: "budget",
				header: t("agent.workspace.budget"),
				size: 150,
				cell: ({ row }) => (
					<div className="text-xs tabular-nums text-muted-foreground">
						{row.original.max_steps} steps · {row.original.max_tokens} tok
					</div>
				),
			},
			{
				id: "tools",
				header: t("agent.workspace.tabTools"),
				size: 120,
				cell: ({ row }) => (
					<div className="flex items-center gap-1.5 text-xs">
						<Badge variant="outline" className="tabular-nums">
							{(row.original.tool_whitelist || []).length} tools
						</Badge>
						{(row.original.mcp_servers || []).length > 0 ? (
							<Badge variant="secondary" className="tabular-nums">
								MCP {row.original.mcp_servers.length}
							</Badge>
						) : null}
					</div>
				),
			},
			{
				id: "guardrail",
				header: t("agent.workspace.tabGuardrail"),
				size: 140,
				cell: ({ row }) => (
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<ShieldCheck className="h-3.5 w-3.5 shrink-0" />
						<span>
							{row.original.guardrail_config?.require_high_risk_review
								? t("agent.workspace.highRiskOn")
								: t("agent.workspace.highRiskOff")}
						</span>
					</div>
				),
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				size: 90,
				cell: ({ row }) =>
					row.original.status === 0 ? (
						<Badge variant="secondary">{t("common.normal")}</Badge>
					) : (
						<Badge variant="outline" className="text-muted-foreground">
							{t("common.disabled")}
						</Badge>
					),
			},
			{
				id: "actions",
				header: t("common.actions"),
				size: 150,
				meta: { fixed: "right" },
				cell: ({ row }) => {
					const item = row.original;
					return (
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								title={t("agent.workspace.debug")}
								onClick={() => navigate({ to: `/agent/playground?agentId=${item.id}` as never })}
							>
								<Play className="h-4 w-4" />
							</Button>
							<Auth permission="agent:workspace:update">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									title={t("common.edit")}
									onClick={() => {
										setEditing(item);
										setDialogOpen(true);
									}}
								>
									<Edit className="h-4 w-4" />
								</Button>
							</Auth>
							<Auth permission="agent:workspace:delete">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-destructive hover:text-destructive"
									title={t("common.delete")}
									onClick={() => handleDelete(item)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</Auth>
						</div>
					);
				},
			},
		],
		[handleDelete, navigate, t],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Input
					value={keyword}
					onChange={(e) => {
						setKeyword(e.target.value);
						setPage(1);
					}}
					placeholder={t("agent.workspace.searchPlaceholder")}
					className="w-64"
				/>
				<Auth permission="agent:workspace:create">
					<Button
						onClick={() => {
							setEditing(null);
							setDialogOpen(true);
						}}
					>
						<Plus className="mr-1.5 h-4 w-4" />
						{t("agent.workspace.addTitle")}
					</Button>
				</Auth>
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

			<AgentFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editing={editing}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["agentDefinitions"] })}
			/>
			<ConfirmDialog />
		</div>
	);
}
