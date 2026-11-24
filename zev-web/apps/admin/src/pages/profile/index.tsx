import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@zev/ui/components/avatar";
import { Button } from "@zev/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zev/ui/components/card";
import { Separator } from "@zev/ui/components/separator";
import { Skeleton } from "@zev/ui/components/skeleton";
import { Tabs, TabsContent, TabsContents, TabsList, TabsTrigger } from "@zev/ui/components/tabs";
import { AtSign, KeyRound, Lock, Mail, RefreshCw, Shield, User as UserIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { getUserInfoApi } from "@/api/system/auth";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { ProfileInfoForm } from "./components/ProfileInfoForm";

type ProfileTab = "basic" | "password";

export default function Profile() {
	const { t } = useI18n();
	const storeUserInfo = useUserStore((state) => state.userInfo);
	const setUserInfo = useUserStore((state) => state.setUserInfo);
	const [activeTab, setActiveTab] = useState<ProfileTab>("basic");
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

	const basicHeadingId = useId();
	const passwordHeadingId = useId();

	const {
		data: fetchedUserInfo,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: ["userInfo"],
		queryFn: getUserInfoApi,
	});

	useEffect(() => {
		if (fetchedUserInfo) {
			setUserInfo(fetchedUserInfo);
		}
	}, [fetchedUserInfo, setUserInfo]);

	const userInfo = fetchedUserInfo ?? storeUserInfo;

	if (isLoading && !userInfo) {
		return (
			<div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
				<Card className="lg:col-span-4 border-border shadow-sm">
					<CardContent className="p-6 space-y-6">
						<div className="flex items-center gap-4">
							<Skeleton className="h-20 w-20 rounded-full shrink-0" />
							<div className="space-y-2 flex-1">
								<Skeleton className="h-6 w-32" />
								<Skeleton className="h-4 w-24" />
							</div>
						</div>
						<Skeleton className="h-px w-full" />
						<div className="space-y-3">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					</CardContent>
				</Card>
				<Card className="lg:col-span-8 border-border shadow-sm">
					<CardContent className="p-6 space-y-4">
						<Skeleton className="h-9 w-56" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isError && !userInfo) {
		return (
			<Card className="w-full border-border shadow-sm">
				<CardContent className="flex flex-col items-center justify-center gap-3 py-16">
					<p className="text-sm text-muted-foreground">{t("profile.loadFailed")}</p>
					<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
						<RefreshCw className="mr-2 h-4 w-4" />
						{t("profile.retry")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (!userInfo) {
		return null;
	}

	const displayNickname = userInfo.nickname || userInfo.username;
	const initials = (displayNickname || "U").slice(0, 2).toUpperCase();
	const displayAvatar = avatarPreview !== null ? avatarPreview : userInfo.avatar;
	const permissions = userInfo.permissions ?? [];
	const roleDisplay = userInfo.role_name
		? userInfo.role_code
			? `${userInfo.role_name} (${userInfo.role_code})`
			: userInfo.role_name
		: t("profile.noRole");

	const infoItems = [
		{ icon: AtSign, label: t("profile.username"), value: userInfo.username },
		{ icon: UserIcon, label: t("profile.nickname"), value: userInfo.nickname || t("profile.unset") },
		{ icon: Mail, label: t("profile.email"), value: userInfo.email || t("profile.unset") },
		{ icon: Shield, label: t("profile.role"), value: roleDisplay },
	];

	return (
		<div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
			{/* 左侧：个人概览与权限信息 */}
			<Card className="lg:col-span-4 border-border shadow-sm">
				<CardContent className="p-6 space-y-6">
					<div className="flex items-center gap-4">
						<Avatar className="h-20 w-20 border-2 border-border shadow-sm shrink-0">
							<AvatarImage src={displayAvatar} alt={displayNickname} />
							<AvatarFallback className="text-2xl font-semibold bg-[var(--color-primary-light)] text-primary">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<h3 className="text-xl font-semibold text-foreground truncate">{displayNickname}</h3>
							<p className="text-sm text-muted-foreground mt-0.5 truncate">@{userInfo.username}</p>
							<span className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[var(--color-primary-light)] text-primary">
								<Shield className="h-3.5 w-3.5 shrink-0" />
								<span className="truncate">{userInfo.role_name || t("profile.noRole")}</span>
							</span>
						</div>
					</div>

					<Separator className="bg-border" />

					<div className="space-y-3.5">
						{infoItems.map((item) => (
							<div key={item.label} className="flex items-center gap-3 group">
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground transition-colors">
									<item.icon className="h-4 w-4" />
								</div>
								<div className="flex-1 min-w-0 flex items-center justify-between gap-3">
									<span className="text-sm text-muted-foreground shrink-0">{item.label}</span>
									<span className="text-sm font-medium text-foreground truncate text-right">{item.value}</span>
								</div>
							</div>
						))}
					</div>

					<Separator className="bg-border" />

					<div>
						<div className="flex items-center gap-2 mb-3">
							<KeyRound className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium text-foreground">{t("profile.permissions")}</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{permissions.length > 0 ? (
								permissions.map((perm) => (
									<span
										key={perm}
										className="px-2.5 py-1 rounded-md text-xs font-mono bg-muted/50 text-muted-foreground border border-border"
									>
										{perm === "*" ? t("profile.allPermissions") : perm}
									</span>
								))
							) : (
								<span className="text-sm text-muted-foreground">{t("profile.noPermissions")}</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 右侧：基本资料编辑与修改密码 */}
			<Card className="lg:col-span-8 border-border shadow-sm">
				<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)} className="gap-0">
					<CardHeader className="pb-4 border-b border-border">
						<TabsList className="mb-3">
							<TabsTrigger value="basic">
								<UserIcon className="h-4 w-4" />
								{t("profile.basicInfoTab")}
							</TabsTrigger>
							<TabsTrigger value="password">
								<Lock className="h-4 w-4" />
								{t("profile.passwordTab")}
							</TabsTrigger>
						</TabsList>

						<CardTitle id={activeTab === "basic" ? basicHeadingId : passwordHeadingId} className="text-base">
							{activeTab === "basic" ? t("profile.basicInfoTab") : t("profile.passwordTab")}
						</CardTitle>
						<CardDescription>
							{activeTab === "basic" ? t("profile.basicInfoDesc") : t("profile.passwordDesc")}
						</CardDescription>
					</CardHeader>

					<CardContent className="p-6">
						<TabsContents>
							<TabsContent value="basic">
								<ProfileInfoForm
									userInfo={userInfo}
									headingId={basicHeadingId}
									onAvatarPreviewChange={setAvatarPreview}
								/>
							</TabsContent>
							<TabsContent value="password">
								<ChangePasswordForm headingId={passwordHeadingId} />
							</TabsContent>
						</TabsContents>
					</CardContent>
				</Tabs>
			</Card>
		</div>
	);
}
