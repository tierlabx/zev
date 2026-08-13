import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { getNoticeList, markNoticeAsRead, type SysNotice } from "@/api/system/notice";

export function NoticePopover() {
	const queryClient = useQueryClient();

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
					className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors relative group outline-none"
				>
					<motion.div
						style={{ originY: 0 }}
						whileHover={{ rotate: [0, -15, 15, -15, 15, 0] }}
						transition={{ duration: 0.5, ease: "easeInOut" }}
					>
						<Bell className="size-4" />
					</motion.div>
					{notices.length > 0 && (
						<span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-zinc-950"></span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex flex-col">
					<div className="flex items-center justify-between p-4 border-b">
						<h4 className="font-semibold text-sm">通知 ({notices.length})</h4>
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
												{new Date(notice.CreatedAt).toLocaleDateString()}
											</span>
										</div>
										<p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
									</button>
								))}
							</div>
						) : (
							<div className="p-4 text-sm text-muted-foreground text-center">暂无新通知。</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
