import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { cn } from "@zev/ui/lib/utils";
import { CheckCheck, Eraser, PenSquare, Search, Send, Settings2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import {
	clearReadNotices,
	deleteMyNotices,
	getMyNoticeDetail,
	getMyNoticeList,
	getUnreadCount,
	type MyNoticeItem,
	markAllNoticesAsRead,
	markNoticeAsRead,
	markNoticeAsUnread,
} from "@/api/system/notice";
import { Auth } from "@/components/auth";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { ComposeDirectMessageDialog } from "./components/ComposeDirectMessageDialog";
import { InboxPane } from "./components/InboxPane";
import { SentMessagesPane } from "./components/SentMessagesPane";

type TabFilter = "all" | "unread" | "1" | "2" | "3" | "sent";

export default function MessagesPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const { confirm, ConfirmDialog } = useConfirm();

	const queryNoticeId = useMemo(() => {
		const raw = (location.search as { id?: unknown } | undefined)?.id;
		if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
			return raw;
		}
		if (typeof raw === "string") {
			const parsed = Number(raw);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
		}
		return null;
	}, [location.search]);

	const [activeTab, setActiveTab] = useState<TabFilter>("all");
	const [levelFilter, setLevelFilter] = useState("all");
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword] = useDebounce(keyword, 300);
	const [inboxPage, setInboxPage] = useState(1);
	const [sentPage, setSentPage] = useState(1);
	const pageSize = 15;

	const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(queryNoticeId);
	const [selectedSentId, setSelectedSentId] = useState<number | null>(null);
	const [checkedIds, setCheckedIds] = useState<number[]>([]);
	const [mobileShowDetail, setMobileShowDetail] = useState(Boolean(queryNoticeId));
	const [composeOpen, setComposeOpen] = useState(false);

	const isSentTab = activeTab === "sent";

	const inboxQueryParams = useMemo(
		() => ({
			page: inboxPage,
			pageSize,
			type: activeTab === "1" || activeTab === "2" || activeTab === "3" ? Number(activeTab) : undefined,
			isRead: activeTab === "unread" ? false : undefined,
			level: levelFilter !== "all" ? Number(levelFilter) : undefined,
			keyword: debouncedKeyword || undefined,
		}),
		[inboxPage, activeTab, levelFilter, debouncedKeyword],
	);

	const { data: listData, isLoading: inboxLoading } = useQuery({
		queryKey: ["myNotices", inboxQueryParams],
		queryFn: () => getMyNoticeList(inboxQueryParams),
		enabled: !isSentTab,
	});

	const { data: unreadStats } = useQuery({
		queryKey: ["noticeUnreadCount"],
		queryFn: getUnreadCount,
	});

	const rows = listData?.list ?? [];
	const total = listData?.total ?? 0;

	const visibleIds = useMemo(() => new Set(rows.map((item) => item.id)), [rows]);
	const validCheckedIds = useMemo(() => checkedIds.filter((id) => visibleIds.has(id)), [checkedIds, visibleIds]);

	const effectiveSelectedId = selectedNoticeId ?? rows[0]?.id ?? null;

	const { data: detailFromApi } = useQuery({
		queryKey: ["myNoticeDetail", effectiveSelectedId],
		queryFn: () => getMyNoticeDetail(effectiveSelectedId as number),
		enabled: !isSentTab && effectiveSelectedId !== null && effectiveSelectedId > 0,
	});

	const activeDetail: MyNoticeItem | null =
		detailFromApi ?? rows.find((item) => item.id === effectiveSelectedId) ?? null;

	const invalidateAllNoticeQueries = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["myNotices"] });
		queryClient.invalidateQueries({ queryKey: ["myNoticeDetail"] });
		queryClient.invalidateQueries({ queryKey: ["sentNotices"] });
		queryClient.invalidateQueries({ queryKey: ["sentNoticeDetail"] });
		queryClient.invalidateQueries({ queryKey: ["manageNotices"] });
		queryClient.invalidateQueries({ queryKey: ["notices"] });
		queryClient.invalidateQueries({ queryKey: ["noticeUnreadCount"] });
	}, [queryClient]);

	const markReadMutation = useMutation({
		mutationFn: markNoticeAsRead,
		onSuccess: invalidateAllNoticeQueries,
	});

	const markUnreadMutation = useMutation({
		mutationFn: markNoticeAsUnread,
		onSuccess: () => {
			toast.success(t("notice.markUnreadSuccess"));
			invalidateAllNoticeQueries();
		},
	});

	const markAllReadMutation = useMutation({
		mutationFn: () => {
			const tabType = activeTab === "1" || activeTab === "2" || activeTab === "3" ? Number(activeTab) : undefined;
			return markAllNoticesAsRead(tabType);
		},
		onSuccess: () => {
			toast.success(t("notice.markAllReadSuccess"));
			invalidateAllNoticeQueries();
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteMyNotices,
		onSuccess: () => {
			toast.success(t("notice.deleteSuccess"));
			setCheckedIds([]);
			setSelectedNoticeId(null);
			setMobileShowDetail(false);
			invalidateAllNoticeQueries();
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.deleteFailed"));
		},
	});

	const clearReadMutation = useMutation({
		mutationFn: clearReadNotices,
		onSuccess: () => {
			toast.success(t("notice.clearReadSuccess"));
			setCheckedIds([]);
			setSelectedNoticeId(null);
			invalidateAllNoticeQueries();
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.clearReadFailed"));
		},
	});

	// 外部通过 ?id= 跳入时切回收件箱、同步选中并自动标为已读
	useEffect(() => {
		if (queryNoticeId) {
			setActiveTab((prev) => (prev === "sent" ? "all" : prev));
			setSelectedNoticeId(queryNoticeId);
			setMobileShowDetail(true);
		}
	}, [queryNoticeId]);

	useEffect(() => {
		if (detailFromApi && !detailFromApi.isRead && queryNoticeId === detailFromApi.id) {
			markReadMutation.mutate(detailFromApi.id);
		}
	}, [detailFromApi, queryNoticeId, markReadMutation.mutate]);

	const handleSelectItem = (item: MyNoticeItem) => {
		setSelectedNoticeId(item.id);
		setMobileShowDetail(true);
		if (!item.isRead) {
			markReadMutation.mutate(item.id);
		}
	};

	const handleToggleCheck = (id: number, checked: boolean) => {
		setCheckedIds((prev) => {
			if (checked) {
				return prev.includes(id) ? prev : [...prev, id];
			}
			return prev.filter((item) => item !== id);
		});
	};

	const handleToggleSelectAll = (checked: boolean) => {
		if (!checked) {
			setCheckedIds([]);
			return;
		}
		setCheckedIds(rows.map((item) => item.id));
	};

	const handleBatchDelete = () => {
		if (validCheckedIds.length === 0) return;
		confirm(t("notice.batchDeleteConfirm", { count: validCheckedIds.length }), () => {
			deleteMutation.mutate(validCheckedIds);
		});
	};

	const handleDeleteSingle = (id: number) => {
		confirm(t("notice.deleteSingleConfirm"), () => {
			deleteMutation.mutate([id]);
		});
	};

	const handleClearRead = () => {
		confirm(t("notice.clearReadConfirm"), () => {
			clearReadMutation.mutate();
		});
	};

	const handleComposeSuccess = (createdId?: number) => {
		invalidateAllNoticeQueries();
		setActiveTab("sent");
		setSentPage(1);
		if (createdId) {
			setSelectedSentId(createdId);
		}
	};

	const inboxTabs: Array<{ key: TabFilter; label: string; count?: number }> = [
		{ key: "all", label: t("notice.tabAll") },
		{ key: "unread", label: t("notice.tabUnread"), count: unreadStats?.total },
		{ key: "1", label: t("notice.typeSystem"), count: unreadStats?.system },
		{ key: "2", label: t("notice.typeReminder"), count: unreadStats?.reminder },
		{ key: "3", label: t("notice.typePrivate"), count: unreadStats?.private },
	];

	return (
		<div className="flex-1 flex flex-col gap-3 min-h-0">
			{/* 顶部工具与分类筛选栏 */}
			<Card className="rounded-md border px-4 py-3 shadow-sm shrink-0">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-1.5">
						{inboxTabs.map((tab) => {
							const active = activeTab === tab.key;
							return (
								<Button
									key={tab.key}
									type="button"
									variant={active ? "default" : "ghost"}
									size="sm"
									className="h-8 gap-1.5 text-xs"
									onClick={() => {
										setActiveTab(tab.key);
										setInboxPage(1);
									}}
								>
									<span>{tab.label}</span>
									{tab.count && tab.count > 0 ? (
										<span
											className={cn(
												"rounded-full px-1.5 py-0 text-[10px] tabular-nums",
												active ? "bg-background/20 text-primary-foreground" : "bg-muted text-muted-foreground",
											)}
										>
											{tab.count > 99 ? "99+" : tab.count}
										</span>
									) : null}
								</Button>
							);
						})}

						<div className="h-4 w-px bg-border mx-1" />

						<Button
							type="button"
							variant={isSentTab ? "default" : "ghost"}
							size="sm"
							className="h-8 gap-1.5 text-xs"
							onClick={() => {
								setActiveTab("sent");
								setSentPage(1);
							}}
						>
							<Send className="h-3.5 w-3.5" />
							<span>{t("notice.tabSent")}</span>
						</Button>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="relative">
							<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={keyword}
								onChange={(e) => {
									setKeyword(e.target.value);
									setInboxPage(1);
									setSentPage(1);
								}}
								placeholder={t("notice.searchPlaceholder")}
								className="h-8 w-44 pl-8 text-xs"
							/>
						</div>
						<Select
							value={levelFilter}
							onValueChange={(value) => {
								setLevelFilter(value);
								setInboxPage(1);
								setSentPage(1);
							}}
						>
							<SelectTrigger className="h-8 w-28 text-xs">
								<SelectValue placeholder={t("notice.level")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("notice.allLevels")}</SelectItem>
								<SelectItem value="0">{t("notice.levelNormal")}</SelectItem>
								<SelectItem value="1">{t("notice.levelImportant")}</SelectItem>
								<SelectItem value="2">{t("notice.levelUrgent")}</SelectItem>
							</SelectContent>
						</Select>

						{!isSentTab ? (
							<>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-8 text-xs"
									disabled={markAllReadMutation.isPending}
									onClick={() => markAllReadMutation.mutate()}
								>
									<CheckCheck className="mr-1.5 h-3.5 w-3.5" />
									{t("header.markAllRead")}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-8 text-xs"
									disabled={validCheckedIds.length === 0 || deleteMutation.isPending}
									onClick={handleBatchDelete}
								>
									<Trash2 className="mr-1.5 h-3.5 w-3.5" />
									{t("notice.batchDelete")}
									{validCheckedIds.length > 0 ? ` (${validCheckedIds.length})` : ""}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-8 text-xs"
									disabled={clearReadMutation.isPending}
									onClick={handleClearRead}
								>
									<Eraser className="mr-1.5 h-3.5 w-3.5" />
									{t("notice.clearRead")}
								</Button>
							</>
						) : null}

						<Button type="button" size="sm" className="h-8 text-xs" onClick={() => setComposeOpen(true)}>
							<PenSquare className="mr-1.5 h-3.5 w-3.5" />
							{t("notice.composeDirect")}
						</Button>
						<Auth permission="system:notice:list">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="h-8 text-xs"
								onClick={() => navigate({ to: "/system/notice" as never })}
							>
								<Settings2 className="mr-1.5 h-3.5 w-3.5" />
								{t("notice.manageEntry")}
							</Button>
						</Auth>
					</div>
				</div>
			</Card>

			{isSentTab ? (
				<SentMessagesPane
					keyword={debouncedKeyword}
					levelFilter={levelFilter}
					page={sentPage}
					pageSize={pageSize}
					selectedSentId={selectedSentId}
					onPageChange={setSentPage}
					onSelectSentId={setSelectedSentId}
					onInvalidateNotices={invalidateAllNoticeQueries}
					onNavigateLink={(link) => navigate({ to: link as never })}
					confirm={confirm}
				/>
			) : (
				<InboxPane
					rows={rows}
					total={total}
					page={inboxPage}
					pageSize={pageSize}
					isLoading={inboxLoading}
					validCheckedIds={validCheckedIds}
					mobileShowDetail={mobileShowDetail}
					activeDetail={activeDetail}
					markingRead={markReadMutation.isPending}
					markingUnread={markUnreadMutation.isPending}
					deleting={deleteMutation.isPending}
					onPageChange={setInboxPage}
					onSelectItem={handleSelectItem}
					onToggleCheck={handleToggleCheck}
					onToggleSelectAll={handleToggleSelectAll}
					onBackToList={() => setMobileShowDetail(false)}
					onMarkRead={(id) => markReadMutation.mutate(id)}
					onMarkUnread={(id) => markUnreadMutation.mutate(id)}
					onDeleteSingle={handleDeleteSingle}
					onNavigateLink={(link) => navigate({ to: link as never })}
				/>
			)}

			<ComposeDirectMessageDialog open={composeOpen} onOpenChange={setComposeOpen} onSuccess={handleComposeSuccess} />
			<ConfirmDialog />
		</div>
	);
}
