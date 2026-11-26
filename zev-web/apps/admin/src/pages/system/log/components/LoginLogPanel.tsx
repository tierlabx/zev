import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { clearLoginLogs, deleteLoginLogs, exportLoginLogs, getLoginLogList, type SysLoginLog } from "@/api/system/log";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { downloadBlobFile } from "@/utils/download";
import { RequestIdCopyButton } from "./RequestIdCopyButton";

interface LoginLogPanelProps {
	canClearAll: boolean;
}

/**
 * 登录审计日志面板（筛选、列表、导出、清理）
 */
export function LoginLogPanel({ canClearAll }: LoginLogPanelProps) {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [usernameInput, setUsernameInput] = useState("");
	const [ipInput, setIpInput] = useState("");
	const [requestIdInput, setRequestIdInput] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");

	const [debouncedUsername] = useDebounce(usernameInput, 300);
	const [debouncedIp] = useDebounce(ipInput, 300);
	const [debouncedRequestId] = useDebounce(requestIdInput, 300);

	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [isExporting, setIsExporting] = useState(false);

	const queryParams = useMemo(
		() => ({
			page,
			pageSize,
			username: debouncedUsername || undefined,
			ip: debouncedIp || undefined,
			requestId: debouncedRequestId || undefined,
			status: statusFilter !== "all" ? Number(statusFilter) : undefined,
			startTime: startTime || undefined,
			endTime: endTime || undefined,
		}),
		[page, pageSize, debouncedUsername, debouncedIp, debouncedRequestId, statusFilter, startTime, endTime],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["loginLogs", queryParams],
		queryFn: () => getLoginLogList(queryParams),
	});

	const rows = data?.list ?? [];
	const total = data?.total ?? 0;

	const visibleRowIdSet = useMemo(() => new Set(rows.map((item) => item.id)), [rows]);
	const validSelectedIds = useMemo(
		() => selectedIds.filter((id) => visibleRowIdSet.has(id)),
		[selectedIds, visibleRowIdSet],
	);

	const deleteMutation = useMutation({
		mutationFn: (ids: number[]) => deleteLoginLogs({ ids }),
		onSuccess: () => {
			toast.success(t("log.deleteSuccess"));
			setSelectedIds([]);
			queryClient.invalidateQueries({ queryKey: ["loginLogs"] });
			queryClient.invalidateQueries({ queryKey: ["logStats"] });
		},
		onError: (err: Error) => {
			toast.error(err.message || t("log.deleteFailed"));
		},
	});

	const clearMutation = useMutation({
		mutationFn: clearLoginLogs,
		onSuccess: () => {
			toast.success(t("log.clearSuccess"));
			setSelectedIds([]);
			queryClient.invalidateQueries({ queryKey: ["loginLogs"] });
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
		confirm(t("log.clearLoginConfirm"), () => {
			clearMutation.mutate();
		});
	}, [confirm, clearMutation, t]);

	const handleExport = useCallback(async () => {
		setIsExporting(true);
		const exportTask = (async () => {
			const blob = await exportLoginLogs({
				username: debouncedUsername || undefined,
				ip: debouncedIp || undefined,
				requestId: debouncedRequestId || undefined,
				status: statusFilter !== "all" ? Number(statusFilter) : undefined,
				startTime: startTime || undefined,
				endTime: endTime || undefined,
			});
			const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
			downloadBlobFile(blob, `login-logs-${stamp}.csv`);
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
	}, [debouncedUsername, debouncedIp, debouncedRequestId, statusFilter, startTime, endTime, t]);

	const handleResetFilters = useCallback(() => {
		setPage(1);
		setSelectedIds([]);
		setUsernameInput("");
		setIpInput("");
		setRequestIdInput("");
		setStatusFilter("all");
		setStartTime("");
		setEndTime("");
	}, []);

	const allSelected = rows.length > 0 && rows.every((r) => validSelectedIds.includes(r.id));
	const someSelected = rows.some((r) => validSelectedIds.includes(r.id)) && !allSelected;

	const columns = useMemo<ColumnDef<SysLoginLog>[]>(
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
				accessorKey: "username",
				header: t("user.username"),
				size: 130,
				cell: ({ row }) => <span className="font-medium">{row.original.username || "-"}</span>,
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				size: 90,
				cell: ({ row }) =>
					row.original.status === 1 ? (
						<Badge
							variant="default"
							className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20 shadow-none"
						>
							{t("log.loginSuccess")}
						</Badge>
					) : (
						<Badge variant="destructive">{t("log.loginFailed")}</Badge>
					),
			},
			{
				accessorKey: "message",
				header: t("log.loginMessage"),
				size: 200,
				cell: ({ row }) => (
					<span className="block max-w-[200px] truncate text-xs" title={row.original.message}>
						{row.original.message || "-"}
					</span>
				),
			},
			{
				accessorKey: "ip",
				header: t("log.ip"),
				size: 130,
				cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip || "-"}</span>,
			},
			{
				id: "clientEnv",
				header: t("log.clientEnv"),
				size: 150,
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground">
						{row.original.browser || "Unknown"} / {row.original.os || "Unknown"}
					</span>
				),
			},
			{
				accessorKey: "requestId",
				header: t("log.requestId"),
				size: 140,
				cell: ({ row }) => <RequestIdCopyButton requestId={row.original.requestId} />,
			},
			{
				accessorKey: "loginTime",
				header: t("log.loginTime"),
				size: 170,
				cell: ({ row }) => (
					<span className="text-xs tabular-nums">
						{row.original.loginTime ? new Date(row.original.loginTime).toLocaleString(locale) : "-"}
					</span>
				),
			},
			{
				id: "actions",
				header: t("common.actions"),
				size: 70,
				meta: { fixed: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end">
						<Auth permission="system:loginlog:delete">
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

	return (
		<div className="flex-1 flex flex-col min-h-0 min-w-0">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-4 shrink-0">
				<div className="flex flex-wrap items-center gap-2">
					<Input
						placeholder={t("log.usernamePlaceholder")}
						value={usernameInput}
						onChange={(e) => {
							setPage(1);
							setUsernameInput(e.target.value);
						}}
						className="w-36 h-9"
					/>
					<Input
						placeholder={t("log.ipPlaceholder")}
						value={ipInput}
						onChange={(e) => {
							setPage(1);
							setIpInput(e.target.value);
						}}
						className="w-36 h-9 font-mono text-xs"
					/>
					<Select
						value={statusFilter}
						onValueChange={(value) => {
							setPage(1);
							setStatusFilter(value);
						}}
					>
						<SelectTrigger className="w-28 h-9">
							<SelectValue placeholder={t("common.status")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("log.allStatus")}</SelectItem>
							<SelectItem value="1">{t("log.loginSuccess")}</SelectItem>
							<SelectItem value="0">{t("log.loginFailed")}</SelectItem>
						</SelectContent>
					</Select>
					<Input
						placeholder={t("log.requestIdPlaceholder")}
						value={requestIdInput}
						onChange={(e) => {
							setPage(1);
							setRequestIdInput(e.target.value);
						}}
						className="w-40 h-9 font-mono text-xs"
					/>
					<Input
						type="date"
						value={startTime}
						onChange={(e) => {
							setPage(1);
							setStartTime(e.target.value);
						}}
						className="w-36 h-9 text-xs"
						aria-label={t("log.startTime")}
					/>
					<Input
						type="date"
						value={endTime}
						onChange={(e) => {
							setPage(1);
							setEndTime(e.target.value);
						}}
						className="w-36 h-9 text-xs"
						aria-label={t("log.endTime")}
					/>
					<Button type="button" variant="ghost" size="sm" className="h-9" onClick={handleResetFilters}>
						<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
						{t("log.reset")}
					</Button>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Auth permission="system:loginlog:export">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-9"
							disabled={isExporting}
							onClick={handleExport}
						>
							<Download className="mr-1.5 h-4 w-4" />
							{t("log.exportCsv")}
						</Button>
					</Auth>
					<Auth permission="system:loginlog:delete">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-9"
							disabled={validSelectedIds.length === 0 || deleteMutation.isPending}
							onClick={handleBatchDelete}
						>
							<Trash2 className="mr-1.5 h-4 w-4" />
							{t("log.batchDelete")}
							{validSelectedIds.length > 0 ? ` (${validSelectedIds.length})` : ""}
						</Button>
						{canClearAll ? (
							<Button
								type="button"
								variant="destructive"
								size="sm"
								className="h-9"
								disabled={clearMutation.isPending}
								onClick={handleClearAll}
							>
								{t("log.clearLogs")}
							</Button>
						) : null}
					</Auth>
				</div>
			</div>

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
			/>

			<ConfirmDialog />
		</div>
	);
}
