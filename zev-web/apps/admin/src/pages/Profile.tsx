import { Avatar, AvatarFallback, AvatarImage } from "@zev/ui/components/avatar";
import { Card, CardContent } from "@zev/ui/components/card";
import { Separator } from "@zev/ui/components/separator";
import { Clock, Mail, Shield, User as UserIcon } from "lucide-react";
import { useUserStore } from "@/store";

export default function Profile() {
	const userInfo = useUserStore((state) => state.userInfo);

	if (!userInfo) {
		return <div className="flex h-full items-center justify-center text-muted-foreground">加载中...</div>;
	}

	const initials = (userInfo.nickname || userInfo.username || "U").slice(0, 2).toUpperCase();

	const infoItems = [
		{ icon: UserIcon, label: "用户名", value: userInfo.username },
		{ icon: UserIcon, label: "昵称", value: userInfo.nickname },
		{ icon: Mail, label: "邮箱", value: userInfo.email || "未设置" },
		{ icon: Shield, label: "角色", value: `${userInfo.role_name} (${userInfo.role_code})` },
	];

	return (
		<div className="p-6 max-w-3xl mx-auto space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight text-foreground">个人中心</h2>
				<p className="text-muted-foreground">管理您的个人资料和账户设置。</p>
			</div>

			<Card className="border-border shadow-sm">
				<CardContent className="p-6 space-y-6">
					{/* 头像和基本信息 */}
					<div className="flex items-center gap-6">
						<Avatar className="h-24 w-24 border-2 border-border shadow-sm">
							<AvatarImage src={userInfo.avatar} alt={userInfo.nickname} />
							<AvatarFallback className="text-3xl font-semibold bg-[var(--color-primary-light)] text-primary">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div>
							<h3 className="text-2xl font-semibold text-foreground">{userInfo.nickname}</h3>
							<p className="text-sm text-muted-foreground mt-1">@{userInfo.username}</p>
							<span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-primary-light)] text-primary">
								<Shield className="h-3.5 w-3.5" />
								{userInfo.role_name}
							</span>
						</div>
					</div>

					<Separator className="bg-border" />

					{/* 详细信息列表 */}
					<div className="space-y-4">
						{infoItems.map((item) => (
							<div key={item.label} className="flex items-center gap-4 group">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground transition-colors">
									<item.icon className="h-4 w-4" />
								</div>
								<div className="flex-1 flex items-center justify-between">
									<span className="text-sm text-muted-foreground">{item.label}</span>
									<span className="text-sm font-medium text-foreground">{item.value}</span>
								</div>
							</div>
						))}
					</div>

					<Separator className="bg-border" />

					{/* 权限信息 */}
					<div>
						<div className="flex items-center gap-2 mb-4">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium text-foreground">权限标识</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{userInfo.permissions.length > 0 ? (
								userInfo.permissions.map((perm) => (
									<span
										key={perm}
										className="px-2.5 py-1 rounded-md text-xs font-mono bg-muted/50 text-muted-foreground border border-border"
									>
										{perm}
									</span>
								))
							) : (
								<span className="text-sm text-muted-foreground">暂无权限</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
