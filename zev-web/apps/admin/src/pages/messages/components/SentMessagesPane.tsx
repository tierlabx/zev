import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { cn } from "@zev/ui/lib/utils";
import { ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock, Send, Undo2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	getSentNoticeDetail,
	getSentNoticeList,
	revokeSentDirectMessage,
	type SentNoticeItem,
} from "@/api/system/notice";
import { useI18n } from "@/i18n";
import { NoticeLevelBadge, NoticeTypeBadge } from "./notice-badges";

interface SentMessagesPaneProps {
	keyword: string;
	levelFilter: string;
	page: number;
	pageSize: number;
	selectedSentId: number | null;
	onPageChange: (page: number) => void;
	onSelectSentId: (id: number | null) => void;
	onInvalidateNotices: () => void;
	onNavigateLink: (link: string) => void;
	confirm: (message: string, onConfirm: () => void) => void;
}

export function SentMessagesPane({
	keyword,
	levelFilter,
	page,
	pageSize,
	selectedSentId,
	onPageChange,
	onSelectSentId,
	onInvalidateNotices,
	onNavigateLink,
	confirm,
}: SentMessagesPaneProps) {
	const { locale, t } = useI18n();
	const [mobileShowDetail, setMobileShowDetail] = useState(false);

	const queryParams = useMemo(
		() => ({
			page,
			pageSize,
			level: levelFilter !== "all" ? Number(levelFilter) : undefined,
			keyword: keyword || undefined,
		}),
		[page, pageSize, levelFilter, keyword],
	);

	const { data: listData, isLoading } = useQuery({
		queryKey: ["sentNotices", queryParams],
		queryFn: () => getSentNoticeList(queryParams),
	});

	const rows = listData?.list ?? [];
	const total = listData?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const effectiveSelectedId = selectedSentId ?? rows[0]?.id ?? null;

	const { data: detailFromApi } = useQuery({
		queryKey: ["sentNoticeDetail", effectiveSelectedId],
		queryFn: () => getSentNoticeDetail(effectiveSelectedId as number),
		enabled: effectiveSelectedId !== null && effectiveSelectedId > 0,
	});

	const activeDetail: SentNoticeItem | null =
		detailFromApi ?? rows.find((item) => item.id === effectiveSelectedId) ?? null;

	const revokeMutation = useMutation({
		mutationFn: revokeSentDirectMessage,
		onSuccess: () => {
			toast.success(t("notice.revokeDirectSuccess"));
			onInvalidateNotices();
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.revokeDirectFailed"));
		},
	});

	const formatRecipientSummary = (item: SentNoticeItem) => {
		if (!item.recipients || item.recipients.length === 0) {
			return "-";
		}
		const sep = locale === "zh-CN" ? "、" : ", ";
		const previewNames = item.recipients
			.slice(0, 2)
			.map((r) => r.nickname || r.username || `#${r.userId}`)
			.join(sep);
		if (item.totalCount > 2) {
			return t("notice.recipientSummaryMore", {
				names: previewNames,
				count: item.totalCount - 2,
			});
		}
		return previewNames;
	};

	const handleSelectItem = (item: SentNoticeItem) => {
		onSelectSentId(item.id);
		setMobileShowDetail(true);
	};

	const handleRevoke = (item: SentNoticeItem) => {
		confirm(t("notice.revokeDirectConfirm", { title: item.title }), () => {
			revokeMutation.mutate(item.id);
		});
	};

	return (
		<Card className="flex-1 min-h-0 rounded-md border shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-[380px_1fr]">
			{/* 左侧已发送列表 */}
			<div
				className={cn(
					"flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r bg-card",
					mobileShowDetail ? "hidden lg:flex" : "flex",
				)}
			>
				<div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 shrink-0 text-xs text-muted-foreground">
					<span>{t("table.totalRecords", { total })}</span>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							disabled={page <= 1}
							onClick={() => onPageChange(Math.max(1, page - 1))}
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
							onClick={() => onPageChange(Math.min(totalPages, page + 1))}
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
								<button
									key={item.id}
									type="button"
									onClick={() => handleSelectItem(item)}
									className={cn(
										"w-full text-left px-4 py-3 space-y-1.5 transition-colors outline-none cursor-pointer",
										isSelected ? "bg-muted/70" : "hover:bg-muted/40",
									)}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="text-sm font-medium truncate text-foreground">{item.title}</span>
										<span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
											{new Date(item.publishedAt || item.createdAt).toLocaleDateString(locale)}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-1.5">
										<NoticeTypeBadge type={item.type} />
										<NoticeLevelBadge level={item.level} />
										{item.status === 2 ? (
											<Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
												{t("notice.statusRevoked")}
											</Badge>
										) : null}
										<span className="ml-auto text-[11px] font-mono text-muted-foreground tabular-nums">
											{t("notice.readProgress", { read: item.readCount, total: item.totalCount })}
										</span>
									</div>
									<div className="text-[11px] text-muted-foreground truncate">
										{t("notice.recipientsLabel")}: {formatRecipientSummary(item)}
									</div>
									<p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
								</button>
							);
						})
					) : (
						<div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
							<Send className="h-8 w-8 opacity-40" />
							<span className="text-sm">{t("notice.sentEmpty")}</span>
						</div>
					)}
				</div>
			</div>

			{/* 右侧已发送详情与接收人回执 */}
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
										<NoticeTypeBadge type={activeDetail.type} />
										<NoticeLevelBadge level={activeDetail.level} />
										<Badge variant="outline" className="font-normal">
											{activeDetail.status === 2 ? t("notice.statusRevoked") : t("notice.statusPublished")}
										</Badge>
										<span className="tabular-nums">
											{t("notice.sentAt")}:{" "}
											{new Date(activeDetail.publishedAt || activeDetail.createdAt).toLocaleString(locale)}
										</span>
										<span>·</span>
										<span className="font-mono tabular-nums">
											{t("notice.readProgress", { read: activeDetail.readCount, total: activeDetail.totalCount })}
										</span>
									</div>
								</div>

								{activeDetail.type === 3 && activeDetail.status === 1 ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-8 text-xs shrink-0"
										disabled={revokeMutation.isPending}
										onClick={() => handleRevoke(activeDetail)}
									>
										<Undo2 className="mr-1.5 h-3.5 w-3.5" />
										{t("notice.revokeDirectAction")}
									</Button>
								) : null}
							</div>
						</div>

						<div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
							<div className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap break-words">
								{activeDetail.content}
							</div>

							{activeDetail.link ? (
								<div className="pt-2 border-t">
									<Button type="button" variant="outline" size="sm" onClick={() => onNavigateLink(activeDetail.link)}>
										{t("notice.openRelatedLink")}
										<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
									</Button>
								</div>
							) : null}

							<div className="pt-4 border-t space-y-3">
								<div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
									<span className="inline-flex items-center gap-1.5">
										<Users className="h-3.5 w-3.5" />
										{t("notice.recipientsDetailTitle")}
									</span>
									<span className="font-mono tabular-nums">
										{activeDetail.readCount} / {activeDetail.totalCount}
									</span>
								</div>

								{activeDetail.recipients && activeDetail.recipients.length > 0 ? (
									<div className="rounded-md border divide-y">
										{activeDetail.recipients.map((recipient) => (
											<div key={recipient.userId} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
												<div className="flex items-center gap-2 min-w-0">
													<span className="font-medium text-foreground truncate">
														{recipient.nickname || recipient.username || `#${recipient.userId}`}
													</span>
													{recipient.username ? (
														<span className="text-muted-foreground truncate">@{recipient.username}</span>
													) : null}
												</div>
												<div className="flex items-center gap-2 shrink-0">
													{recipient.isRead ? (
														<>
															{recipient.readAt ? (
																<span className="hidden sm:inline text-[11px] text-muted-foreground tabular-nums">
																	{t("notice.readAtLabel")} {new Date(recipient.readAt).toLocaleString(locale)}
																</span>
															) : null}
															<Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px] font-normal">
																<Check className="h-3 w-3" />
																{t("notice.statusRead")}
															</Badge>
														</>
													) : (
														<Badge
															variant="outline"
															className="gap-1 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
														>
															<Clock className="h-3 w-3" />
															{t("notice.statusUnread")}
														</Badge>
													)}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="text-xs text-muted-foreground">{t("common.noData")}</div>
								)}
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-8">
						<Send className="h-10 w-10 opacity-30" />
						<span className="text-sm">{t("notice.sentSelectPrompt")}</span>
					</div>
				)}
			</div>
		</Card>
	);
}
