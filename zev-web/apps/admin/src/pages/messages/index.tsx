import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { cn } from "@zev/ui/lib/utils";
import {
	ArrowLeft,
	ArrowUpRight,
	BellRing,
	CheckCheck,
	ChevronLeft,
	ChevronRight,
	Eraser,
	Mail,
	MailOpen,
	PenSquare,
	Search,
	Settings2,
	Trash2,
} from "lucide-react";
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
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { ComposeDirectMessageDialog } from "./components/ComposeDirectMessageDialog";

type TabFilter = "all" | "unread" | "1" | "2" | "3";

export default function MessagesPage() {
	const { locale, t } = useI18n();
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
	const [page, setPage] = useState(1);
	const pageSize = 15;

	const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(queryNoticeId);
	const [checkedIds, setCheckedIds] = useState<number[]>([]);
	const [mobileShowDetail, setMobileShowDetail] = useState(Boolean(queryNoticeId));
	const [composeOpen, setComposeOpen] = useState(false);

	const queryParams = useMemo(
		() => ({
			page,
			pageSize,
			type: activeTab === "1" || activeTab === "2" || activeTab === "3" ? Number(activeTab) : undefined,
			isRead: activeTab === "unread" ? false : undefined,
			level: levelFilter !== "all" ? Number(levelFilter) : undefined,
			keyword: debouncedKeyword || undefined,
		}),
		[page, activeTab, levelFilter, debouncedKeyword],
	);

	const { data: listData, isLoading } = useQuery({
		queryKey: ["myNotices", queryParams],
		queryFn: () => getMyNoticeList(queryParams),
	});

	const { data: unreadStats } = useQuery({
		queryKey: ["noticeUnreadCount"],
		queryFn: getUnreadCount,
	});

	const rows = listData?.list ?? [];
	const total = listData?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	const visibleIds = useMemo(() => new Set(rows.map((item) => item.id)), [rows]);
	const validCheckedIds = useMemo(() => checkedIds.filter((id) => visibleIds.has(id)), [checkedIds, visibleIds]);

	const effectiveSelectedId = selectedNoticeId ?? rows[0]?.id ?? null;

	const { data: detailFromApi } = useQuery({
		queryKey: ["myNoticeDetail", effectiveSelectedId],
		queryFn: () => getMyNoticeDetail(effectiveSelectedId as number),
		enabled: effectiveSelectedId !== null && effectiveSelectedId > 0,
	});

	const activeDetail: MyNoticeItem | null =
		detailFromApi ?? rows.find((item) => item.id === effectiveSelectedId) ?? null;

	const invalidateAllNoticeQueries = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["myNotices"] });
		queryClient.invalidateQueries({ queryKey: ["myNoticeDetail"] });
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

	// 外部通过 ?id= 跳入时同步选中并自动标为已读
	useEffect(() => {
		if (queryNoticeId) {
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

	const typeBadge = (type: number) => {
		switch (type) {
			case 2:
				return t("notice.typeReminder");
			case 3:
				return t("notice.typePrivate");
			default:
				return t("notice.typeSystem");
		}
	};

	const levelBadge = (level: number) => {
		if (level >= 2) {
			return <Badge variant="destructive">{t("notice.levelUrgent")}</Badge>;
		}
		if (level === 1) {
			return (
				<Badge variant="outline" className="border-foreground/40 text-foreground">
					{t("notice.levelImportant")}
				</Badge>
			);
		}
		return null;
	};

	const tabs: Array<{ key: TabFilter; label: string; count?: number }> = [
		{ key: "all", label: t("notice.tabAll") },
		{ key: "unread", label: t("notice.tabUnread"), count: unreadStats?.total },
		{ key: "1", label: t("notice.typeSystem"), count: unreadStats?.system },
		{ key: "2", label: t("notice.typeReminder"), count: unreadStats?.reminder },
		{ key: "3", label: t("notice.typePrivate"), count: unreadStats?.private },
	];

	const allChecked = rows.length > 0 && rows.every((item) => validCheckedIds.includes(item.id));
	const someChecked = rows.some((item) => validCheckedIds.includes(item.id)) && !allChecked;

	return (
		<div className="flex-1 flex flex-col gap-3 min-h-0">
			{/* 顶部工具与分类筛选栏 */}
			<Card className="rounded-md border px-4 py-3 shadow-sm shrink-0">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-1.5">
						{tabs.map((tab) => {
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
										setPage(1);
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
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="relative">
							<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={keyword}
								onChange={(e) => {
									setKeyword(e.target.value);
									setPage(1);
								}}
								placeholder={t("notice.searchPlaceholder")}
								className="h-8 w-44 pl-8 text-xs"
							/>
						</div>
						<Select
							value={levelFilter}
							onValueChange={(value) => {
								setLevelFilter(value);
								setPage(1);
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

			{/* 主体双栏阅读区 */}
			<Card className="flex-1 min-h-0 rounded-md border shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-[380px_1fr]">
				{/* 左侧收件箱列表 */}
				<div
					className={cn(
						"flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r bg-card",
						mobileShowDetail ? "hidden lg:flex" : "flex",
					)}
				>
					<div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 shrink-0 text-xs text-muted-foreground">
						<div className="flex items-center gap-2">
							<Checkbox
								checked={allChecked || (someChecked && "indeterminate")}
								onCheckedChange={(v) => handleToggleSelectAll(!!v)}
								aria-label={t("common.selectAll")}
							/>
							<span>{t("table.totalRecords", { total })}</span>
						</div>
						<div className="flex items-center gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<ChevronLeft className="h-3.5 w-3.5" />
							</Button>
							<span className="tabular-nums px-1">
								{page} / {totalPages}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<ChevronRight className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto divide-y">
						{isLoading ? (
							<div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
						) : rows.length > 0 ? (
							rows.map((item) => {
								const isSelected = activeDetail?.id === item.id;
								return (
									<div
										key={item.id}
										className={cn(
											"flex items-start gap-2.5 px-4 py-3 transition-colors",
											isSelected ? "bg-muted/70" : "hover:bg-muted/40",
										)}
									>
										<div className="pt-0.5 shrink-0">
											<Checkbox
												checked={validCheckedIds.includes(item.id)}
												onCheckedChange={(v) => handleToggleCheck(item.id, !!v)}
												aria-label={item.title}
											/>
										</div>
										<button
											type="button"
											onClick={() => handleSelectItem(item)}
											className="flex-1 min-w-0 text-left space-y-1 outline-none cursor-pointer"
										>
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-1.5 min-w-0">
													{!item.isRead ? (
														<span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
													) : (
														<span className="h-2 w-2 rounded-full bg-transparent shrink-0" />
													)}
													<span
														className={cn("text-sm truncate", item.isRead ? "text-foreground/80" : "font-semibold")}
													>
														{item.title}
													</span>
												</div>
												<span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
													{new Date(item.publishedAt || item.createdAt).toLocaleDateString(locale)}
												</span>
											</div>
											<div className="flex items-center gap-1.5 pl-3.5">
												<Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
													{typeBadge(item.type)}
												</Badge>
												{levelBadge(item.level)}
												<span className="text-[11px] text-muted-foreground truncate">{item.sender || "-"}</span>
											</div>
											<p className="text-xs text-muted-foreground line-clamp-2 pl-3.5">{item.content}</p>
										</button>
									</div>
								);
							})
						) : (
							<div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
								<BellRing className="h-8 w-8 opacity-40" />
								<span className="text-sm">{t("notice.emptyInbox")}</span>
							</div>
						)}
					</div>
				</div>

				{/* 右侧消息正文面板 */}
				<div className={cn("flex flex-col min-h-0 min-w-0", mobileShowDetail ? "flex" : "hidden lg:flex")}>
					{activeDetail ? (
						<>
							<div className="border-b px-6 py-4 space-y-3 shrink-0">
								<div className="flex items-start justify-between gap-3">
									<div className="space-y-1.5 min-w-0">
										<div className="flex items-center gap-2 lg:hidden">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-7 px-2 -ml-2 text-xs"
												onClick={() => setMobileShowDetail(false)}
											>
												<ArrowLeft className="mr-1 h-3.5 w-3.5" />
												{t("notice.backToList")}
											</Button>
										</div>
										<h3 className="text-base font-semibold text-foreground break-words">{activeDetail.title}</h3>
										<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
											<Badge variant="secondary" className="font-normal">
												{typeBadge(activeDetail.type)}
											</Badge>
											{levelBadge(activeDetail.level)}
											<Badge variant="outline" className="font-normal">
												{activeDetail.isRead ? t("notice.statusRead") : t("notice.statusUnread")}
											</Badge>
											<span>
												{t("notice.senderLabel")}: {activeDetail.sender || "-"}
											</span>
											<span>·</span>
											<span className="tabular-nums">
												{new Date(activeDetail.publishedAt || activeDetail.createdAt).toLocaleString(locale)}
											</span>
										</div>
									</div>

									<div className="flex items-center gap-1.5 shrink-0">
										{activeDetail.isRead ? (
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="h-8 text-xs"
												disabled={markUnreadMutation.isPending}
												onClick={() => markUnreadMutation.mutate(activeDetail.id)}
											>
												<Mail className="mr-1.5 h-3.5 w-3.5" />
												{t("notice.markUnread")}
											</Button>
										) : (
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="h-8 text-xs"
												disabled={markReadMutation.isPending}
												onClick={() => markReadMutation.mutate(activeDetail.id)}
											>
												<MailOpen className="mr-1.5 h-3.5 w-3.5" />
												{t("notice.markRead")}
											</Button>
										)}
										<Button
											type="button"
											variant="destructive"
											size="sm"
											className="h-8 text-xs"
											disabled={deleteMutation.isPending}
											onClick={() => handleDeleteSingle(activeDetail.id)}
										>
											<Trash2 className="mr-1.5 h-3.5 w-3.5" />
											{t("common.delete")}
										</Button>
									</div>
								</div>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
								<div className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap break-words">
									{activeDetail.content}
								</div>

								{activeDetail.link ? (
									<div className="pt-2 border-t">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => navigate({ to: activeDetail.link as never })}
										>
											{t("notice.openRelatedLink")}
											<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
										</Button>
									</div>
								) : null}
							</div>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-8">
							<MailOpen className="h-10 w-10 opacity-30" />
							<span className="text-sm">{t("notice.selectPrompt")}</span>
						</div>
					)}
				</div>
			</Card>

			<ComposeDirectMessageDialog
				open={composeOpen}
				onOpenChange={setComposeOpen}
				onSuccess={invalidateAllNoticeQueries}
			/>
			<ConfirmDialog />
		</div>
	);
}
