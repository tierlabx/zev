import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Activity, Edit, Plus, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { type AgentProvider, deleteProvider, getProviderList, pingProvider } from "@/api/agent";
import { Auth } from "@/components/auth";
import { TableFacetedFilter, ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { ProviderFormDialog } from "./components/ProviderFormDialog";

export default function AgentProviderPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [keyword, setKeyword] = useState("");
	const [providerType, setProviderType] = useState("all");
	const [debouncedKeyword] = useDebounce(keyword, 300);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<AgentProvider | null>(null);
	const [pingingId, setPingingId] = useState<number | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["agentProviders", page, pageSize, debouncedKeyword, providerType],
		queryFn: () =>
			getProviderList({
				page,
				pageSize,
				keyword: debouncedKeyword,
				providerType: providerType === "all" ? undefined : providerType,
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteProvider,
		onSuccess: () => {
			toast.success(t("agent.common.deleteSuccess"));
			queryClient.invalidateQueries({ queryKey: ["agentProviders"] });
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const handlePing = useCallback(
		async (item: AgentProvider) => {
			setPingingId(item.id);
			try {
				const res = await pingProvider(item.id);
				if (res.reachable) {
					toast.success(`${item.name}: ${res.message} (${res.latency_ms}ms)`);
				} else {
					toast.error(`${item.name}: ${res.message}`);
				}
			} catch (err) {
				toast.error(err instanceof Error ? err.message : t("agent.provider.pingFailed"));
			} finally {
				setPingingId(null);
			}
		},
		[t],
	);

	const handleDelete = useCallback(
		(item: AgentProvider) => {
			confirm(t("agent.provider.deleteConfirm", { name: item.name }), () => {
				deleteMutation.mutate(item.id);
			});
		},
		[confirm, deleteMutation, t],
	);

	const columns = useMemo<ColumnDef<AgentProvider>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("agent.provider.name"),
				size: 160,
				cell: ({ row }) => (
					<div className="font-medium text-foreground truncate" title={row.original.name}>
						{row.original.name}
					</div>
				),
			},
			{
				accessorKey: "provider_type",
				header: t("agent.provider.type"),
				size: 110,
				cell: ({ row }) => (
					<Badge variant="outline" className="uppercase font-mono text-[11px]">
						{row.original.provider_type}
					</Badge>
				),
			},
			{
				accessorKey: "default_model",
				header: t("agent.provider.defaultModel"),
				size: 160,
				cell: ({ row }) => <span className="font-mono text-xs">{row.original.default_model}</span>,
			},
			{
				accessorKey: "base_url",
				header: t("agent.provider.baseUrl"),
				size: 240,
				cell: ({ row }) => (
					<span className="font-mono text-xs text-muted-foreground truncate block" title={row.original.base_url}>
						{row.original.base_url}
					</span>
				),
			},
			{
				accessorKey: "api_key_masked",
				header: t("agent.provider.apiKey"),
				size: 140,
				cell: ({ row }) => (
					<span className="font-mono text-xs text-muted-foreground">
						{row.original.has_api_key ? row.original.api_key_masked : "-"}
					</span>
				),
			},
			{
				accessorKey: "timeout_sec",
				header: t("agent.provider.timeoutSec"),
				size: 90,
				cell: ({ row }) => <span className="tabular-nums text-xs">{row.original.timeout_sec}s</span>,
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
								title={t("agent.provider.ping")}
								disabled={pingingId === item.id}
								onClick={() => void handlePing(item)}
							>
								<Activity className="h-4 w-4" />
							</Button>
							<Auth permission="agent:provider:update">
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
							<Auth permission="agent:provider:delete">
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
		[handleDelete, handlePing, pingingId, t],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
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
				toolbarLeft={
					<>
						<Input
							value={keyword}
							onChange={(e) => {
								setKeyword(e.target.value);
								setPage(1);
							}}
							placeholder={t("agent.provider.searchPlaceholder")}
							className="h-8 w-60"
						/>
						<TableFacetedFilter
							title={t("agent.provider.allTypes")}
							value={providerType}
							onChange={(val) => {
								setProviderType(val);
								setPage(1);
							}}
							options={[
								{ label: "OpenAI", value: "openai" },
								{ label: "Anthropic", value: "anthropic" },
								{ label: "Gemini", value: "gemini" },
								{ label: "Ollama", value: "ollama" },
							]}
						/>
						{keyword || providerType !== "all" ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 px-2 text-xs"
								onClick={() => {
									setKeyword("");
									setProviderType("all");
									setPage(1);
								}}
							>
								{t("table.resetFilters")}
								<X className="ml-1.5 h-3.5 w-3.5" />
							</Button>
						) : null}
					</>
				}
				toolbarRight={
					<Auth permission="agent:provider:create">
						<Button
							size="sm"
							className="h-8"
							onClick={() => {
								setEditing(null);
								setDialogOpen(true);
							}}
						>
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							{t("agent.provider.addTitle")}
						</Button>
					</Auth>
				}
			/>

			<ProviderFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editing={editing}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["agentProviders"] })}
			/>
			<ConfirmDialog />
		</div>
	);
}
