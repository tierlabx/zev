import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Download, Eye, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { clearOperLogs, deleteOperLogs, exportOperLogs, getOperLogList, type SysOperLog } from "@/api/system/log";
import { Auth } from "@/components/auth";
import { TableFacetedFilter, ZevTable } from "@/components/zev-table";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { downloadBlobFile } from "@/utils/download";
import { OperLogDetailSheet } from "./OperLogDetailSheet";
import { RequestIdCopyButton } from "./RequestIdCopyButton";

const MODULE_OPTIONS = [
	"用户管理",
	"角色管理",
	"菜单管理",
	"部门管理",
	"字典类型",
	"字典数据",
	"系统通知",
	"操作日志",
	"登录日志",
	"个人中心",
	"认证授权",
	"系统管理",
] as const;

interface OperLogPanelProps {
	canClearAll: boolean;
}

/**
 * 操作审计日志面板（筛选、列表、导出、清理及详情抽屉）
 */
export function OperLogPanel({ canClearAll }: OperLogPanelProps) {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [operatorInput, setOperatorInput] = useState("");
	const [requestIdInput, setRequestIdInput] = useState("");
	const [moduleFilter, setModuleFilter] = useState("all");
	const [methodFilter, setMethodFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");

	const [debouncedOperator] = useDebounce(operatorInput, 300);
	const [debouncedRequestId] = useDebounce(requestIdInput, 300);

	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [detailOpen, setDetailOpen] = useState(false);
	const [activeLog, setActiveLog] = useState<SysOperLog | null>(null);
	const [isExporting, setIsExporting] = useState(false);

	const queryParams = useMemo(
		() => ({
			page,
			pageSize,
			operator: debouncedOperator || undefined,
			requestId: debouncedRequestId || undefined,
			module: moduleFilter !== "all" ? moduleFilter : undefined,
			method: methodFilter !== "all" ? methodFilter : undefined,
			status: statusFilter !== "all" ? Number(statusFilter) : undefined,
			startTime: startTime || undefined,
			endTime: endTime || undefined,
		}),
		[
			page,
			pageSize,
			debouncedOperator,
			debouncedRequestId,
			moduleFilter,
			methodFilter,
			statusFilter,
			startTime,
			endTime,
		],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["operLogs", queryParams],
		queryFn: () => getOperLogList(queryParams),
	});

	const rows = data?.list ?? [];
	const total = data?.total ?? 0;

	const visibleRowIdSet = useMemo(() => new Set(rows.map((item) => item.id)), [rows]);
	const validSelectedIds = useMemo(
		() => selectedIds.filter((id) => visibleRowIdSet.has(id)),
		[selectedIds, visibleRowIdSet],
	);

	const deleteMutation = useMutation({
		mutationFn: (ids: number[]) => deleteOperLogs({ ids }),
		onSuccess: () => {
			toast.success(t("log.deleteSuccess"));
			setSelectedIds([]);
			queryClient.invalidateQueries({ queryKey: ["operLogs"] });
			queryClient.invalidateQueries({ queryKey: ["logStats"] });
		},
		onError: (err: Error) => {
			toast.error(err.message || t("log.deleteFailed"));
		},
	});

	const clearMutation = useMutation({
		mutationFn: clearOperLogs,
		onSuccess: () => {
			toast.success(t("log.clearSuccess"));
			setSelectedIds([]);
			queryClient.invalidateQueries({ queryKey: ["operLogs"] });
			queryClient.invalidateQueries({ queryKey: ["logStats"] });
		},
		onError: (err: Error) => {
			toast.error(err.message || t("log.clearFailed"));
		},
	});

	const handleToggleAll = useCallback(
		(checked: boolean) => {
			if (!checked) {
				setSelectedIds([]);
				return;
			}
			setSelectedIds(rows.map((item) => item.id));
		},
		[rows],
	);

	const handleToggleRow = useCallback((id: number, checked: boolean) => {
		setSelectedIds((prev) => {
			if (checked) {
				return prev.includes(id) ? prev : [...prev, id];
			}
			return prev.filter((item) => item !== id);
		});
	}, []);

	const handleDeleteSingle = useCallback(
		(id: number) => {
			confirm(t("log.deleteSingleConfirm"), () => {
				deleteMutation.mutate([id]);
			});
		},
		[confirm, deleteMutation, t],
	);

	const handleBatchDelete = useCallback(() => {
		if (validSelectedIds.length === 0) return;
		confirm(t("log.batchDeleteConfirm", { count: validSelectedIds.length }), () => {
			deleteMutation.mutate(validSelectedIds);
		});
	}, [confirm, deleteMutation, validSelectedIds, t]);

	const handleClearAll = useCallback(() => {
		confirm(t("log.clearOperConfirm"), () => {
			clearMutation.mutate();
		});
	}, [confirm, clearMutation, t]);

	const handleExport = useCallback(async () => {
		setIsExporting(true);
		const exportTask = (async () => {
			const blob = await exportOperLogs({
				operator: debouncedOperator || undefined,
				requestId: debouncedRequestId || undefined,
				module: moduleFilter !== "all" ? moduleFilter : undefined,
				method: methodFilter !== "all" ? methodFilter : undefined,
				status: statusFilter !== "all" ? Number(statusFilter) : undefined,
				startTime: startTime || undefined,
				endTime: endTime || undefined,
			});
			const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
			downloadBlobFile(blob, `oper-logs-${stamp}.csv`);
		})();

		toast.promise(exportTask, {
			loading: t("common.loading"),
			success: t("log.exportSuccess"),
			error: (err) => (err instanceof Error && err.message ? err.message : t("log.exportFailed")),
		});

		try {
			await exportTask;
		} catch {
			// 错误提示已由 toast.promise 统一处理
		} finally {
			setIsExporting(false);
		}
	}, [debouncedOperator, debouncedRequestId, moduleFilter, methodFilter, statusFilter, startTime, endTime, t]);

	const handleResetFilters = useCallback(() => {
		setPage(1);
		setSelectedIds([]);
		setOperatorInput("");
		setRequestIdInput("");
		setModuleFilter("all");
		setMethodFilter("all");
		setStatusFilter("all");
		setStartTime("");
		setEndTime("");
	}, []);

	const allSelected = rows.length > 0 && rows.every((r) => validSelectedIds.includes(r.id));
	const someSelected = rows.some((r) => validSelectedIds.includes(r.id)) && !allSelected;

	const columns = useMemo<ColumnDef<SysOperLog>[]>(
		() => [
			{
				id: "select",
				size: 40,
				header: () => (
					<Checkbox
						checked={allSelected || (someSelected && "indeterminate")}
						onCheckedChange={(value) => handleToggleAll(!!value)}
						aria-label={t("common.selectAll")}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={validSelectedIds.includes(row.original.id)}
						onCheckedChange={(value) => handleToggleRow(row.original.id, !!value)}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "operator",
				header: t("log.operator"),
				size: 110,
				cell: ({ row }) => <span className="font-medium">{row.original.operator || "-"}</span>,
			},
			{
				accessorKey: "module",
				header: t("log.module"),
				size: 115,
			},
			{
				accessorKey: "action",
				header: t("log.action"),
				size: 115,
				cell: ({ row }) => (
					<Badge variant="secondary" className="font-normal">
						{row.original.action}
					</Badge>
				),
			},
			{
				accessorKey: "method",
				header: t("log.method"),
				size: 85,
				cell: ({ row }) => (
					<Badge variant="outline" className="font-mono text-[11px]">
						{row.original.method}
					</Badge>
				),
			},
			{
				accessorKey: "url",
				header: t("log.url"),
				size: 210,
				cell: ({ row }) => (
					<span
						className="block max-w-[200px] truncate font-mono text-xs text-muted-foreground"
						title={row.original.url}
					>
						{row.original.url}
					</span>
				),
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				size: 85,
				cell: ({ row }) =>
					row.original.status === 1 ? (
						<Badge
							variant="default"
							className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20 shadow-none"
						>
							{t("log.success")}
						</Badge>
					) : (
						<Badge variant="destructive">{t("log.failed")}</Badge>
					),
			},
			{
				accessorKey: "latency",
				header: t("log.latency"),
				size: 90,
				cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.latency} ms</span>,
			},
			{
				accessorKey: "ip",
				header: t("log.ip"),
				size: 120,
				cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip || "-"}</span>,
			},
			{
				id: "clientEnv",
				header: t("log.clientEnv"),
				size: 130,
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground">
						{row.original.browser || "Unknown"} / {row.original.os || "Unknown"}
					</span>
				),
			},
			{
				accessorKey: "requestId",
				header: t("log.requestId"),
				size: 130,
				cell: ({ row }) => <RequestIdCopyButton requestId={row.original.requestId} />,
			},
			{
				accessorKey: "createdAt",
				header: t("log.operTime"),
				size: 165,
				cell: ({ row }) => (
					<span className="text-xs tabular-nums">
						{row.original.createdAt ? new Date(row.original.createdAt).toLocaleString(locale) : "-"}
					</span>
				),
			},
			{
				id: "actions",
				header: t("common.actions"),
				size: 100,
				meta: { fixed: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => {
								setActiveLog(row.original);
								setDetailOpen(true);
							}}
							title={t("log.viewDetail")}
						>
							<Eye className="h-4 w-4" />
						</Button>
						<Auth permission="system:operlog:delete">
							<Button
								variant="destructive"
								size="icon"
								onClick={() => handleDeleteSingle(row.original.id)}
								title={t("common.delete")}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</Auth>
					</div>
				),
			},
		],
		[allSelected, someSelected, validSelectedIds, handleToggleAll, handleToggleRow, handleDeleteSingle, locale, t],
	);

	const hasFilters =
		Boolean(operatorInput || requestIdInput || startTime || endTime) ||
		moduleFilter !== "all" ||
		methodFilter !== "all" ||
		statusFilter !== "all";

	return (
		<div className="flex-1 flex flex-col min-h-0 min-w-0">
			<ZevTable
				className="flex-1 min-h-0"
				columns={columns}
				data={rows}
				isLoading={isLoading}
				page={page}
				pageSize={pageSize}
				total={total}
				onPageChange={setPage}
				onPageSizeChange={(newSize) => {
					setPageSize(newSize);
					setPage(1);
				}}
				toolbarLeft={
					<>
						<Input
							placeholder={t("log.operatorPlaceholder")}
							value={operatorInput}
							onChange={(e) => {
								setPage(1);
								setOperatorInput(e.target.value);
							}}
							className="w-36 h-8"
						/>
						<TableFacetedFilter
							title={t("log.module")}
							value={moduleFilter}
							onChange={(value) => {
								setPage(1);
								setModuleFilter(value);
							}}
							options={MODULE_OPTIONS.map((mod) => ({ label: mod, value: mod }))}
						/>
						<TableFacetedFilter
							title={t("log.method")}
							value={methodFilter}
							onChange={(value) => {
								setPage(1);
								setMethodFilter(value);
							}}
							options={[
								{ label: "POST", value: "POST" },
								{ label: "PUT", value: "PUT" },
								{ label: "DELETE", value: "DELETE" },
							]}
						/>
						<TableFacetedFilter
							title={t("common.status")}
							value={statusFilter}
							onChange={(value) => {
								setPage(1);
								setStatusFilter(value);
							}}
							options={[
								{ label: t("log.success"), value: "1" },
								{ label: t("log.failed"), value: "0" },
							]}
						/>
						<Input
							placeholder={t("log.requestIdPlaceholder")}
							value={requestIdInput}
							onChange={(e) => {
								setPage(1);
								setRequestIdInput(e.target.value);
							}}
							className="w-40 h-8 font-mono text-xs"
						/>
						<Input
							type="date"
							value={startTime}
							onChange={(e) => {
								setPage(1);
								setStartTime(e.target.value);
							}}
							className="w-36 h-8 text-xs"
							aria-label={t("log.startTime")}
						/>
						<Input
							type="date"
							value={endTime}
							onChange={(e) => {
								setPage(1);
								setEndTime(e.target.value);
							}}
							className="w-36 h-8 text-xs"
							aria-label={t("log.endTime")}
						/>
						{hasFilters ? (
							<Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleResetFilters}>
								{t("table.resetFilters")}
								<X className="ml-1.5 h-3.5 w-3.5" />
							</Button>
						) : null}
					</>
				}
				toolbarRight={
					<>
						<Auth permission="system:operlog:export">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8"
								disabled={isExporting}
								onClick={handleExport}
							>
								<Download className="mr-1.5 h-3.5 w-3.5" />
								{t("log.exportCsv")}
							</Button>
						</Auth>
						<Auth permission="system:operlog:delete">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8"
								disabled={validSelectedIds.length === 0 || deleteMutation.isPending}
								onClick={handleBatchDelete}
							>
								<Trash2 className="mr-1.5 h-3.5 w-3.5" />
								{t("log.batchDelete")}
								{validSelectedIds.length > 0 ? ` (${validSelectedIds.length})` : ""}
							</Button>
							{canClearAll ? (
								<Button
									type="button"
									variant="destructive"
									size="sm"
									className="h-8"
									disabled={clearMutation.isPending}
									onClick={handleClearAll}
								>
									{t("log.clearLogs")}
								</Button>
							) : null}
						</Auth>
					</>
				}
			/>

			<OperLogDetailSheet
				open={detailOpen}
				onOpenChange={setDetailOpen}
				logId={activeLog?.id ?? null}
				initialData={activeLog}
			/>
			<ConfirmDialog />
		</div>
	);
}
