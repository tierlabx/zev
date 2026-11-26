import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Edit, Plus, RotateCcw, Send, Trash2, Undo2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import {
	deleteManageNotices,
	getManageNoticeList,
	type ManageNoticeItem,
	publishNotice,
	revokeNotice,
} from "@/api/system/notice";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { NoticeFormDialog } from "./components/NoticeFormDialog";

export default function NoticeManagement() {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword] = useDebounce(keyword, 300);
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingNotice, setEditingNotice] = useState<ManageNoticeItem | null>(null);

	const queryParams = useMemo(
		() => ({
			page,
			pageSize,
			keyword: debouncedKeyword || undefined,
			type: typeFilter !== "all" ? Number(typeFilter) : undefined,
			status: statusFilter !== "all" ? Number(statusFilter) : undefined,
		}),
		[page, pageSize, debouncedKeyword, typeFilter, statusFilter],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["manageNotices", queryParams],
		queryFn: () => getManageNoticeList(queryParams),
	});

	const rows = data?.list ?? [];
	const total = data?.total ?? 0;

	const visibleRowIdSet = useMemo(() => new Set(rows.map((item) => item.id)), [rows]);
	const validSelectedIds = useMemo(
		() => selectedIds.filter((id) => visibleRowIdSet.has(id)),
		[selectedIds, visibleRowIdSet],
	);

	const refreshAllNoticeQueries = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["manageNotices"] });
		queryClient.invalidateQueries({ queryKey: ["myNotices"] });
		queryClient.invalidateQueries({ queryKey: ["sentNotices"] });
		queryClient.invalidateQueries({ queryKey: ["sentNoticeDetail"] });
		queryClient.invalidateQueries({ queryKey: ["notices"] });
		queryClient.invalidateQueries({ queryKey: ["noticeUnreadCount"] });
	}, [queryClient]);

	const publishMutation = useMutation({
		mutationFn: publishNotice,
		onSuccess: () => {
			toast.success(t("notice.publishSuccess"));
			refreshAllNoticeQueries();
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.publishFailed"));
		},
	});

	const revokeMutation = useMutation({
		mutationFn: revokeNotice,
		onSuccess: () => {
			toast.success(t("notice.revokeSuccess"));
			refreshAllNoticeQueries();
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.revokeFailed"));
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteManageNotices,
		onSuccess: () => {
			toast.success(t("notice.deleteSuccess"));
			setSelectedIds([]);
			refreshAllNoticeQueries();
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.deleteFailed"));
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

	const handlePublish = useCallback(
		(id: number) => {
			confirm(t("notice.publishConfirm"), () => {
				publishMutation.mutate(id);
			});
		},
		[confirm, publishMutation, t],
	);

	const handleRevoke = useCallback(
		(id: number) => {
			confirm(t("notice.revokeConfirm"), () => {
				revokeMutation.mutate(id);
			});
		},
		[confirm, revokeMutation, t],
	);

	const handleDeleteSingle = useCallback(
		(id: number) => {
			confirm(t("notice.deleteSingleConfirm"), () => {
				deleteMutation.mutate([id]);
			});
		},
		[confirm, deleteMutation, t],
	);

	const handleBatchDelete = useCallback(() => {
		if (validSelectedIds.length === 0) return;
		confirm(t("notice.batchDeleteConfirm", { count: validSelectedIds.length }), () => {
			deleteMutation.mutate(validSelectedIds);
		});
	}, [confirm, deleteMutation, validSelectedIds, t]);

	const handleResetFilters = useCallback(() => {
		setPage(1);
		setSelectedIds([]);
		setKeyword("");
		setTypeFilter("all");
		setStatusFilter("all");
	}, []);

	const allSelected = rows.length > 0 && rows.every((r) => validSelectedIds.includes(r.id));
	const someSelected = rows.some((r) => validSelectedIds.includes(r.id)) && !allSelected;

	const typeText = useCallback(
		(type: number) => {
			switch (type) {
				case 2:
					return t("notice.typeReminder");
				case 3:
					return t("notice.typePrivate");
				default:
					return t("notice.typeSystem");
			}
		},
		[t],
	);

	const targetTypeText = useCallback(
		(targetType: number) => {
			switch (targetType) {
				case 2:
					return t("notice.targetDept");
				case 3:
					return t("notice.targetRole");
				case 4:
					return t("notice.targetUser");
				default:
					return t("notice.targetAll");
			}
		},
		[t],
	);

	const columns = useMemo<ColumnDef<ManageNoticeItem>[]>(
		() => [
			{
				id: "select",
				size: 40,
				header: () => (
					<Checkbox
						checked={allSelected || (someSelected && "indeterminate")}
						onCheckedChange={(v) => handleToggleAll(!!v)}
						aria-label={t("common.selectAll")}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={validSelectedIds.includes(row.original.id)}
						onCheckedChange={(v) => handleToggleRow(row.original.id, !!v)}
						aria-label={row.original.title}
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "title",
				header: t("notice.title"),
				size: 240,
				cell: ({ row }) => (
					<div className="flex items-center gap-2 min-w-0">
						<span className="font-medium truncate max-w-[200px]" title={row.original.title}>
							{row.original.title}
						</span>
						{row.original.level >= 2 ? <Badge variant="destructive">{t("notice.levelUrgent")}</Badge> : null}
					</div>
				),
			},
			{
				accessorKey: "type",
				header: t("notice.type"),
				size: 100,
				cell: ({ row }) => (
					<Badge variant="secondary" className="font-normal">
						{typeText(row.original.type)}
					</Badge>
				),
			},
			{
				accessorKey: "targetType",
				header: t("notice.targetType"),
				size: 105,
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground">{targetTypeText(row.original.targetType)}</span>
				),
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				size: 90,
				cell: ({ row }) => {
					if (row.original.status === 1) {
						return (
							<Badge
								variant="default"
								className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20 shadow-none"
							>
								{t("notice.statusPublished")}
							</Badge>
						);
					}
					if (row.original.status === 2) {
						return <Badge variant="outline">{t("notice.statusRevoked")}</Badge>;
					}
					return <Badge variant="secondary">{t("notice.statusDraft")}</Badge>;
				},
			},
			{
				id: "receipt",
				header: t("notice.readReceipt"),
				size: 110,
				cell: ({ row }) => (
					<span className="font-mono text-xs tabular-nums">
						{row.original.readCount} / {row.original.totalCount}
					</span>
				),
			},
			{
				accessorKey: "sender",
				header: t("notice.senderLabel"),
				size: 100,
				cell: ({ row }) => <span>{row.original.sender || "-"}</span>,
			},
			{
				id: "publishTime",
				header: t("notice.publishedAt"),
				size: 165,
				cell: ({ row }) => (
					<span className="text-xs tabular-nums">
						{new Date(row.original.publishedAt || row.original.createdAt).toLocaleString(locale)}
					</span>
				),
			},
			{
				id: "actions",
				header: t("common.actions"),
				size: 135,
				meta: { fixed: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						<Auth permission="system:notice:update">
							<Button
								variant="outline"
								size="icon"
								onClick={() => {
									setEditingNotice(row.original);
									setDialogOpen(true);
								}}
								title={t("common.edit")}
							>
								<Edit className="h-4 w-4" />
							</Button>
						</Auth>
						{row.original.status !== 1 ? (
							<Auth permission={["system:notice:send", "system:notice:update"]}>
								<Button
									variant="outline"
									size="icon"
									onClick={() => handlePublish(row.original.id)}
									title={t("notice.publishAction")}
								>
									<Send className="h-4 w-4" />
								</Button>
							</Auth>
						) : (
							<Auth permission={["system:notice:send", "system:notice:update"]}>
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleRevoke(row.original.id)}
									title={t("notice.revokeAction")}
								>
									<Undo2 className="h-4 w-4" />
								</Button>
							</Auth>
						)}
						<Auth permission="system:notice:delete">
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
		[
			allSelected,
			someSelected,
			validSelectedIds,
			handleToggleAll,
			handleToggleRow,
			handlePublish,
			handleRevoke,
			handleDeleteSingle,
			typeText,
			targetTypeText,
			locale,
			t,
		],
	);

	return (
		<div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
			<Card className="flex-1 flex flex-col rounded-md shadow-sm border p-4 min-h-0 min-w-0 overflow-hidden">
				<div className="flex flex-wrap items-center justify-between gap-2 mb-4 shrink-0">
					<div className="flex flex-wrap items-center gap-2">
						<Input
							placeholder={t("notice.searchPlaceholder")}
							value={keyword}
							onChange={(e) => {
								setPage(1);
								setKeyword(e.target.value);
							}}
							className="w-56 h-9"
						/>
						<Select
							value={typeFilter}
							onValueChange={(value) => {
								setPage(1);
								setTypeFilter(value);
							}}
						>
							<SelectTrigger className="w-32 h-9">
								<SelectValue placeholder={t("notice.type")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("notice.allTypes")}</SelectItem>
								<SelectItem value="1">{t("notice.typeSystem")}</SelectItem>
								<SelectItem value="2">{t("notice.typeReminder")}</SelectItem>
								<SelectItem value="3">{t("notice.typePrivate")}</SelectItem>
							</SelectContent>
						</Select>
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
								<SelectItem value="all">{t("notice.allStatus")}</SelectItem>
								<SelectItem value="0">{t("notice.statusDraft")}</SelectItem>
								<SelectItem value="1">{t("notice.statusPublished")}</SelectItem>
								<SelectItem value="2">{t("notice.statusRevoked")}</SelectItem>
							</SelectContent>
						</Select>
						<Button type="button" variant="ghost" size="sm" className="h-9" onClick={handleResetFilters}>
							<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
							{t("notice.reset")}
						</Button>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Auth permission="system:notice:delete">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-9"
								disabled={validSelectedIds.length === 0 || deleteMutation.isPending}
								onClick={handleBatchDelete}
							>
								<Trash2 className="mr-1.5 h-4 w-4" />
								{t("notice.batchDelete")}
								{validSelectedIds.length > 0 ? ` (${validSelectedIds.length})` : ""}
							</Button>
						</Auth>
						<Auth permission={["system:notice:create", "system:notice:send"]}>
							<Button
								type="button"
								size="sm"
								className="h-9"
								onClick={() => {
									setEditingNotice(null);
									setDialogOpen(true);
								}}
							>
								<Plus className="mr-1.5 h-4 w-4" />
								{t("notice.createAction")}
							</Button>
						</Auth>
					</div>
				</div>

				<div className="flex-1 min-h-0 min-w-0 flex flex-col">
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
				</div>
			</Card>

			<NoticeFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editingNotice={editingNotice}
				onSuccess={refreshAllNoticeQueries}
			/>
			<ConfirmDialog />
		</div>
	);
}
