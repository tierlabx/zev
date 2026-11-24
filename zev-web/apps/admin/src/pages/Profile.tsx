import { Avatar, AvatarFallback, AvatarImage } from "@zev/ui/components/avatar";
import { Card, CardContent } from "@zev/ui/components/card";
import { Separator } from "@zev/ui/components/separator";
import { Clock, Mail, Shield, User as UserIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";

export default function Profile() {
	const { t } = useI18n();
	const userInfo = useUserStore((state) => state.userInfo);

	if (!userInfo) {
		return <div className="flex h-full items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
	}

	const initials = (userInfo.nickname || userInfo.username || "U").slice(0, 2).toUpperCase();

	const infoItems = [
		{ icon: UserIcon, label: t("profile.username"), value: userInfo.username },
		{ icon: UserIcon, label: t("profile.nickname"), value: userInfo.nickname },
		{ icon: Mail, label: t("profile.email"), value: userInfo.email || t("profile.unset") },
		{ icon: Shield, label: t("profile.role"), value: `${userInfo.role_name} (${userInfo.role_code})` },
	];

	return (
		<div className="p-6 max-w-3xl mx-auto space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight text-foreground">{t("profile.title")}</h2>
				<p className="text-muted-foreground">{t("profile.subtitle")}</p>
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
							<span className="text-sm font-medium text-foreground">{t("profile.permissions")}</span>
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
								<span className="text-sm text-muted-foreground">{t("profile.noPermissions")}</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
