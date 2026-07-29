import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@zev/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@zev/ui/components/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { useLogoutMutation } from "@/api/system/auth";
import { useUserStore } from "@/store";

export function AccountDropdown() {
	const logout = useUserStore((state) => state.logout);
	const userInfo = useUserStore((state) => state.userInfo);
	const navigate = useNavigate();
	const logoutMutation = useLogoutMutation();

	const nickname = userInfo?.nickname || "用户";
	const email = userInfo?.email || "";
	const avatar = userInfo?.avatar || "";
	const initials = nickname.slice(0, 2).toUpperCase();

	const handleLogout = async () => {
		try {
			await logoutMutation.mutateAsync();
		} catch {
			// logout failure is fine, we clear local state anyway
		} finally {
			logout();
			navigate({ to: "/login" });
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="outline-none flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 pr-3 hover:bg-gray-50 transition-colors"
				>
					<Avatar className="h-7 w-7">
						<AvatarImage src={avatar} alt={nickname} />
						<AvatarFallback className="text-xs">{initials}</AvatarFallback>
					</Avatar>
					<span className="text-sm font-medium">{nickname}</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{nickname}</p>
						{email && <p className="text-xs leading-none text-muted-foreground">{email}</p>}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="cursor-pointer" onClick={() => navigate({ to: "/dashboard" })}>
					<User className="mr-2 h-4 w-4" />
					<span>个人中心</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
					onClick={handleLogout}
				>
					<LogOut className="mr-2 h-4 w-4" />
					<span>退出登录</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
