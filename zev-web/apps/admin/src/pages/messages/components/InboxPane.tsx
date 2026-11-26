import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { cn } from "@zev/ui/lib/utils";
import { ArrowLeft, ArrowUpRight, BellRing, ChevronLeft, ChevronRight, Mail, MailOpen, Trash2 } from "lucide-react";
import type { MyNoticeItem } from "@/api/system/notice";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useI18n } from "@/i18n";
import { NoticeLevelBadge, NoticeTypeBadge } from "./notice-badges";

interface InboxPaneProps {
	rows: MyNoticeItem[];
	total: number;
	page: number;
	pageSize: number;
	isLoading: boolean;
	validCheckedIds: number[];
	mobileShowDetail: boolean;
	activeDetail: MyNoticeItem | null;
	markingRead: boolean;
	markingUnread: boolean;
	deleting: boolean;
	onPageChange: (page: number) => void;
	onSelectItem: (item: MyNoticeItem) => void;
	onToggleCheck: (id: number, checked: boolean) => void;
	onToggleSelectAll: (checked: boolean) => void;
	onBackToList: () => void;
	onMarkRead: (id: number) => void;
	onMarkUnread: (id: number) => void;
	onDeleteSingle: (id: number) => void;
	onNavigateLink: (link: string) => void;
}

export function InboxPane({
	rows,
	total,
	page,
	pageSize,
	isLoading,
	validCheckedIds,
	mobileShowDetail,
	activeDetail,
	markingRead,
	markingUnread,
	deleting,
	onPageChange,
	onSelectItem,
	onToggleCheck,
	onToggleSelectAll,
	onBackToList,
	onMarkRead,
	onMarkUnread,
	onDeleteSingle,
	onNavigateLink,
}: InboxPaneProps) {
	const { locale, t } = useI18n();
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const allChecked = rows.length > 0 && rows.every((item) => validCheckedIds.includes(item.id));
	const someChecked = rows.some((item) => validCheckedIds.includes(item.id)) && !allChecked;

	return (
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
							onCheckedChange={(v) => onToggleSelectAll(!!v)}
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
											onCheckedChange={(v) => onToggleCheck(item.id, !!v)}
											aria-label={item.title}
										/>
									</div>
									<button
										type="button"
										onClick={() => onSelectItem(item)}
										className="flex-1 min-w-0 text-left space-y-1 outline-none cursor-pointer"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-1.5 min-w-0">
												{!item.isRead ? (
													<span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
												) : (
													<span className="h-2 w-2 rounded-full bg-transparent shrink-0" />
												)}
												<span className={cn("text-sm truncate", item.isRead ? "text-foreground/80" : "font-semibold")}>
													{item.title}
												</span>
											</div>
											<span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
												{new Date(item.publishedAt || item.createdAt).toLocaleDateString(locale)}
											</span>
										</div>
										<div className="flex items-center gap-1.5 pl-3.5">
											<NoticeTypeBadge type={item.type} />
											<NoticeLevelBadge level={item.level} />
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
											onClick={onBackToList}
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
											disabled={markingUnread}
											onClick={() => onMarkUnread(activeDetail.id)}
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
											disabled={markingRead}
											onClick={() => onMarkRead(activeDetail.id)}
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
										disabled={deleting}
										onClick={() => onDeleteSingle(activeDetail.id)}
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
									<Button type="button" variant="outline" size="sm" onClick={() => onNavigateLink(activeDetail.link)}>
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
	);
}
