import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { useEffect, useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import type { UserInfo } from "@/api/interface/system/user";
import { updateProfile } from "@/api/system/user";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";

interface ProfileInfoFormProps {
	userInfo: UserInfo;
	headingId: string;
	onAvatarPreviewChange: (avatar: string) => void;
}

type ProfileFormValues = {
	nickname: string;
	email: string;
	avatar: string;
};

export function ProfileInfoForm({ userInfo, headingId, onAvatarPreviewChange }: ProfileInfoFormProps) {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const setUserInfo = useUserStore((state) => state.setUserInfo);
	const usernameId = useId();
	const usernameHintId = useId();

	const profileSchema = useMemo(
		() =>
			z.object({
				nickname: z.string().trim().min(2, t("profile.nicknameMin")).max(50, t("profile.nicknameMax")),
				email: z
					.string()
					.trim()
					.refine((val) => val === "" || z.string().email().safeParse(val).success, {
						message: t("profile.emailInvalid"),
					}),
				avatar: z
					.string()
					.trim()
					.refine(
						(val) => val === "" || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"),
						{ message: t("profile.avatarInvalid") },
					),
			}),
		[t],
	);

	const form = useForm<ProfileFormValues>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(profileSchema) as any,
		mode: "onBlur",
		reValidateMode: "onChange",
		defaultValues: {
			nickname: userInfo.nickname || "",
			email: userInfo.email || "",
			avatar: userInfo.avatar || "",
		},
	});

	useEffect(() => {
		if (!form.formState.isDirty) {
			form.reset({
				nickname: userInfo.nickname || "",
				email: userInfo.email || "",
				avatar: userInfo.avatar || "",
			});
			onAvatarPreviewChange(userInfo.avatar || "");
		}
	}, [userInfo, form, onAvatarPreviewChange]);

	const mutation = useMutation({
		mutationFn: updateProfile,
		onSuccess: (updatedUser) => {
			toast.success(t("profile.updateProfileSuccess"));
			queryClient.setQueryData(["userInfo"], updatedUser);
			setUserInfo(updatedUser);
			form.reset({
				nickname: updatedUser.nickname || "",
				email: updatedUser.email || "",
				avatar: updatedUser.avatar || "",
			});
			onAvatarPreviewChange(updatedUser.avatar || "");
		},
		onError: (error: Error) => {
			toast.error(error.message || t("profile.updateProfileFailed"));
		},
	});

	const handleReset = () => {
		form.reset({
			nickname: userInfo.nickname || "",
			email: userInfo.email || "",
			avatar: userInfo.avatar || "",
		});
		onAvatarPreviewChange(userInfo.avatar || "");
	};

	return (
		<Form {...form}>
			<form
				aria-labelledby={headingId}
				onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
				className="space-y-5"
			>
				<div className="space-y-2">
					<Label htmlFor={usernameId}>{t("profile.username")}</Label>
					<Input
						id={usernameId}
						value={userInfo.username}
						readOnly
						disabled
						autoComplete="username"
						aria-describedby={usernameHintId}
						className="bg-muted/50 text-muted-foreground"
					/>
					<p id={usernameHintId} className="text-[0.8rem] text-muted-foreground">
						{t("profile.usernameHint")}
					</p>
				</div>

				<FormField
					control={form.control}
					name="nickname"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{t("profile.nickname")} <span aria-hidden="true">*</span>
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									required
									autoComplete="nickname"
									enterKeyHint="next"
									placeholder={t("profile.nicknamePlaceholder")}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("profile.email")}</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="email"
									autoComplete="email"
									autoCorrect="off"
									autoCapitalize="none"
									spellCheck={false}
									enterKeyHint="next"
									placeholder={t("profile.emailPlaceholder")}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="avatar"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("profile.avatar")}</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="url"
									autoComplete="photo"
									autoCorrect="off"
									autoCapitalize="none"
									spellCheck={false}
									enterKeyHint="done"
									placeholder={t("profile.avatarPlaceholder")}
									onChange={(e) => {
										field.onChange(e);
										onAvatarPreviewChange(e.target.value);
									}}
								/>
							</FormControl>
							<FormDescription>{t("profile.avatarHint")}</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex items-center justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={handleReset} disabled={mutation.isPending}>
						{t("profile.reset")}
					</Button>
					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? t("common.saving") : t("profile.saveProfile")}
					</Button>
				</div>
			</form>
		</Form>
	);
}
