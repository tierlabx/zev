import { AnimateIcon } from "@animate-ui/react/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "@zev/ui/components/animate-ui/icons/bell";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { CheckCheck, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	getNoticeList,
	getUnreadCount,
	type MyNoticeItem,
	markAllNoticesAsRead,
	markNoticeAsRead,
} from "@/api/system/notice";
import { useNoticeStream } from "@/hooks/use-notice-stream";
import { useI18n } from "@/i18n";

export function NoticePopover() {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	// 订阅 SSE 实时通知流
	useNoticeStream();

	const { data: unreadCountData } = useQuery({
		queryKey: ["noticeUnreadCount"],
		queryFn: getUnreadCount,
		refetchInterval: 30000,
	});

	const { data: notices = [] } = useQuery({
		queryKey: ["notices"],
		queryFn: () => getNoticeList(6),
		refetchInterval: 30000,
	});

	const totalUnread = unreadCountData?.total ?? notices.length;

	const invalidateAllNoticeQueries = () => {
		queryClient.invalidateQueries({ queryKey: ["notices"] });
		queryClient.invalidateQueries({ queryKey: ["noticeUnreadCount"] });
		queryClient.invalidateQueries({ queryKey: ["myNotices"] });
	};

	const { mutate: markAsRead } = useMutation({
		mutationFn: markNoticeAsRead,
		onSuccess: invalidateAllNoticeQueries,
	});

	const { mutate: markAllRead, isPending: markingAll } = useMutation({
		mutationFn: () => markAllNoticesAsRead(),
		onSuccess: () => {
			toast.success(t("notice.markAllReadSuccess"));
			invalidateAllNoticeQueries();
		},
	});

	const handleSelectNotice = (notice: MyNoticeItem) => {
		if (!notice.isRead) {
			markAsRead(notice.id);
		}
		setOpen(false);
		navigate({ to: `/messages?id=${notice.id}` as never });
	};

	const handleGoMessageCenter = () => {
		setOpen(false);
		navigate({ to: "/messages" as never });
	};

	const typeLabel = (type: number) => {
		switch (type) {
			case 2:
				return t("notice.typeReminder");
			case 3:
				return t("notice.typePrivate");
			default:
				return t("notice.typeSystem");
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors relative group outline-none"
					aria-label={t("header.notifications", { count: totalUnread })}
				>
					<AnimateIcon animateOnHover className="inline-flex items-center justify-center">
						<Bell className="size-4" />
					</AnimateIcon>
					{totalUnread > 0 ? (
						<span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-medium leading-4 text-destructive-foreground text-center tabular-nums">
							{totalUnread > 99 ? "99+" : totalUnread}
						</span>
					) : null}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-88 p-0">
				<div className="flex flex-col">
					<div className="flex items-center justify-between px-4 py-3 border-b">
						<h4 className="font-semibold text-sm">{t("header.notifications", { count: totalUnread })}</h4>
						{totalUnread > 0 ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
								disabled={markingAll}
								onClick={() => markAllRead()}
							>
								<CheckCheck className="mr-1 h-3.5 w-3.5" />
								{t("header.markAllRead")}
							</Button>
						) : null}
					</div>
					<div className="max-h-80 overflow-y-auto">
						{notices.length > 0 ? (
							<div className="flex flex-col">
								{notices.map((notice) => (
									<button
										type="button"
										key={notice.id}
										className="flex flex-col text-left gap-1.5 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors w-full outline-none"
										onClick={() => handleSelectNotice(notice)}
									>
										<div className="flex items-center justify-between gap-2 w-full">
											<div className="flex items-center gap-1.5 min-w-0">
												<Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal shrink-0">
													{typeLabel(notice.type)}
												</Badge>
												{notice.level >= 2 ? (
													<Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-normal shrink-0">
														{t("notice.levelUrgent")}
													</Badge>
												) : null}
												<span className="font-medium text-sm truncate">{notice.title}</span>
											</div>
											<span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
												{new Date(notice.publishedAt || notice.createdAt).toLocaleDateString(locale)}
											</span>
										</div>
										<p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
									</button>
								))}
							</div>
						) : (
							<div className="py-8 px-4 text-sm text-muted-foreground text-center">{t("header.noNotifications")}</div>
						)}
					</div>
					<div className="border-t p-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-full justify-center text-xs h-8"
							onClick={handleGoMessageCenter}
						>
							{t("header.viewAllMessages")}
							<ChevronRight className="ml-1 h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
