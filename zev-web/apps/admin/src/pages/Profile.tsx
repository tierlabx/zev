import { Avatar, AvatarFallback, AvatarImage } from "@zev/ui/components/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@zev/ui/components/card";
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
		<div className="p-6 max-w-3xl mx-auto">
			<Card className="border border-[#E5E5E5] shadow-sm">
				<CardHeader className="pb-4">
					<CardTitle className="text-lg">个人中心</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* 头像和基本信息 */}
					<div className="flex items-center gap-4">
						<Avatar className="h-20 w-20 border-2 border-[#E5E5E5]">
							<AvatarImage src={userInfo.avatar} alt={userInfo.nickname} />
							<AvatarFallback className="text-2xl font-semibold bg-[#EFF6FF] text-[#2563EB]">{initials}</AvatarFallback>
						</Avatar>
						<div>
							<h3 className="text-xl font-semibold text-gray-900">{userInfo.nickname}</h3>
							<p className="text-sm text-muted-foreground mt-1">@{userInfo.username}</p>
							<span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#2563EB]">
								<Shield className="h-3 w-3" />
								{userInfo.role_name}
							</span>
						</div>
					</div>

					<Separator />

					{/* 详细信息列表 */}
					<div className="space-y-4">
						{infoItems.map((item) => (
							<div key={item.label} className="flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
									<item.icon className="h-4 w-4" />
								</div>
								<div className="flex-1 flex items-center justify-between">
									<span className="text-sm text-muted-foreground">{item.label}</span>
									<span className="text-sm font-medium text-gray-900">{item.value}</span>
								</div>
							</div>
						))}
					</div>

					<Separator />

					{/* 权限信息 */}
					<div>
						<div className="flex items-center gap-2 mb-3">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium text-gray-700">权限标识</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{userInfo.permissions.length > 0 ? (
								userInfo.permissions.map((perm) => (
									<span
										key={perm}
										className="px-2.5 py-1 rounded-md text-xs font-mono bg-gray-50 text-gray-600 border border-gray-200"
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
