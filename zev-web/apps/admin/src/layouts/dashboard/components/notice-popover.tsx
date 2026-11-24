import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { Bell } from "lucide-react";
import { motion } from "motion/react";
import { getNoticeList, markNoticeAsRead, type SysNotice } from "@/api/system/notice";
import { useI18n } from "@/i18n";

export function NoticePopover() {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const reduce = useShouldReduceMotion();
	const shakeTransition = useTempoTransition(motionTransition.shake);

	const { data: notices = [] } = useQuery({
		queryKey: ["notices"],
		queryFn: getNoticeList,
		refetchInterval: 30000,
	});

	const { mutate: markAsRead } = useMutation({
		mutationFn: markNoticeAsRead,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notices"] });
		},
	});

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors relative group outline-none"
				>
					<motion.div
						style={{ originY: 0 }}
						whileHover={reduce ? undefined : { rotate: [0, -12, 12, -8, 8, 0] }}
						transition={shakeTransition}
					>
						<Bell className="size-4" />
					</motion.div>
					{notices.length > 0 && (
						<span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-card"></span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex flex-col">
					<div className="flex items-center justify-between p-4 border-b">
						<h4 className="font-semibold text-sm">{t("header.notifications", { count: notices.length })}</h4>
					</div>
					<div className="max-h-80 overflow-y-auto">
						{notices.length > 0 ? (
							<div className="flex flex-col">
								{notices.map((notice: SysNotice) => (
									<button
										type="button"
										key={notice.id}
										className="flex flex-col text-left gap-1 p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors w-full outline-none"
										onClick={() => markAsRead(notice.id)}
									>
										<div className="flex items-center justify-between w-full">
											<span className="font-medium text-sm">{notice.title}</span>
											<span className="text-[10px] text-muted-foreground">
												{new Date(notice.CreatedAt).toLocaleDateString(locale)}
											</span>
										</div>
										<p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
									</button>
								))}
							</div>
						) : (
							<div className="p-4 text-sm text-muted-foreground text-center">{t("header.noNotifications")}</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
