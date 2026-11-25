import { AnimateIcon } from "@animate-ui/react/icons";
import { useNavigate } from "@tanstack/react-router";
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
import { useLogoutMutation } from "@/api/system/auth";
import { useI18n } from "@/i18n";
import { clearSessionAndRedirectToLogin } from "@/router/session";
import { useUserStore } from "@/store";

export function AccountDropdown() {
	const { t } = useI18n();
	const userInfo = useUserStore((state) => state.userInfo);
	const navigate = useNavigate();
	const logoutMutation = useLogoutMutation();

	const nickname = userInfo?.nickname || t("common.user");
	const email = userInfo?.email || "";
	const avatar = userInfo?.avatar || "";
	const initials = nickname.slice(0, 2).toUpperCase();

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
					className="outline-none flex items-center gap-2 rounded-full border border-border bg-card text-foreground p-1 pr-3 hover:bg-muted transition-colors cursor-pointer"
				>
					<Avatar className="h-7 w-7">
						<AvatarImage src={avatar} alt={nickname} />
						<AvatarFallback className="text-xs">{initials}</AvatarFallback>
					</Avatar>
					<span className="text-sm font-medium">{nickname}</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end">
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{nickname}</p>
						{email && <p className="text-xs leading-none text-muted-foreground">{email}</p>}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<AnimateIcon animateOnHover asChild>
					<DropdownMenuItem className="cursor-pointer" onClick={() => navigate({ to: "/profile" as never })}>
						<User className="mr-2 h-4 w-4" />
						<span>{t("header.profile")}</span>
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
