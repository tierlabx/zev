import { AnimateIcon } from "@animate-ui/react/icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "@zev/ui/components/animate-ui/icons/bell";
import { LogOut } from "@zev/ui/components/animate-ui/icons/log-out";
import { User } from "@zev/ui/components/animate-ui/icons/user";
import { Avatar, AvatarFallback, AvatarImage } from "@zev/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@zev/ui/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useLogoutMutation } from "@/api/system/auth";
import { getUnreadCount } from "@/api/system/notice";
import { useI18n } from "@/i18n";
import { clearSessionAndRedirectToLogin } from "@/router/session";
import { useUserStore } from "@/store";
import { getAvatarInitials } from "@/utils/avatar";

export function AccountDropdown() {
	const { t } = useI18n();
	const userInfo = useUserStore((state) => state.userInfo);
	const navigate = useNavigate();
	const logoutMutation = useLogoutMutation();

	const { data: unreadCountData } = useQuery({
		queryKey: ["noticeUnreadCount"],
		queryFn: getUnreadCount,
		staleTime: 30000,
	});

	const nickname = userInfo?.nickname || t("common.user");
	const secondaryText = userInfo?.email || (userInfo?.username ? `@${userInfo.username}` : "");
	const avatar = userInfo?.avatar || "";
	const initials = getAvatarInitials(nickname);
	const unreadCount = unreadCountData?.total ?? 0;

	const handleLogout = async () => {
		try {
			await logoutMutation.mutateAsync();
		} catch {
			// logout failure is fine, we clear local state anyway
		} finally {
			// 运行时清空会话并重建无权限路由树，实现无刷新平滑退出
			clearSessionAndRedirectToLogin();
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="group outline-none inline-flex items-center gap-2 rounded-full border border-border/80 bg-card pl-1 pr-2.5 py-1 text-foreground shadow-2xs hover:bg-muted/80 hover:border-border-hover data-[state=open]:bg-muted data-[state=open]:border-border-hover focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors cursor-pointer"
				>
					<Avatar className="h-7 w-7 ring-1 ring-border/70 shrink-0">
						<AvatarImage src={avatar} alt={nickname} />
						<AvatarFallback className="bg-foreground text-background text-xs font-semibold select-none">
							{initials}
						</AvatarFallback>
					</Avatar>
					<span className="max-w-[120px] truncate text-sm font-medium leading-none">{nickname}</span>
					<ChevronDown className="size-3.5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-60" align="end">
				<DropdownMenuLabel className="font-normal py-2">
					<div className="flex items-center gap-2.5">
						<Avatar className="h-9 w-9 ring-1 ring-border/70 shrink-0">
							<AvatarImage src={avatar} alt={nickname} />
							<AvatarFallback className="bg-foreground text-background text-xs font-semibold select-none">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1 flex flex-col space-y-1">
							<p className="text-sm font-medium leading-none truncate">{nickname}</p>
							{secondaryText && <p className="text-xs leading-none text-muted-foreground truncate">{secondaryText}</p>}
						</div>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<AnimateIcon animateOnHover asChild>
					<DropdownMenuItem className="cursor-pointer" onClick={() => navigate({ to: "/profile" as never })}>
						<User className="mr-2 h-4 w-4" />
						<span>{t("header.profile")}</span>
					</DropdownMenuItem>
				</AnimateIcon>
				<AnimateIcon animateOnHover asChild>
					<DropdownMenuItem className="cursor-pointer" onClick={() => navigate({ to: "/messages" as never })}>
						<Bell className="mr-2 h-4 w-4" />
						<span>{t("header.messageCenter")}</span>
						{unreadCount > 0 ? (
							<span className="ml-auto inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium leading-none text-destructive-foreground tabular-nums">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						) : null}
					</DropdownMenuItem>
				</AnimateIcon>
				<DropdownMenuSeparator />
				<AnimateIcon animateOnHover asChild>
					<DropdownMenuItem
						className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
						onClick={handleLogout}
					>
						<LogOut className="mr-2 h-4 w-4" />
						<span>{t("header.logout")}</span>
					</DropdownMenuItem>
				</AnimateIcon>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
