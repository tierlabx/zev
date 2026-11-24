import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { changePassword } from "@/api/system/user";
import { useI18n } from "@/i18n";

interface ChangePasswordFormProps {
	headingId: string;
}

type PasswordFormValues = {
	old_password: string;
	new_password: string;
	confirm_password: string;
};

type PasswordFieldName = keyof PasswordFormValues;

export function ChangePasswordForm({ headingId }: ChangePasswordFormProps) {
	const { t } = useI18n();
	const [visibility, setVisibility] = useState<Record<PasswordFieldName, boolean>>({
		old_password: false,
		new_password: false,
		confirm_password: false,
	});

	const passwordSchema = useMemo(
		() =>
			z
				.object({
					old_password: z.string().min(1, t("profile.oldPasswordRequired")),
					new_password: z.string().min(6, t("profile.newPasswordMin")).max(64, t("profile.newPasswordMax")),
					confirm_password: z.string().min(1, t("profile.confirmPasswordRequired")),
				})
				.superRefine((data, ctx) => {
					if (data.old_password && data.new_password && data.old_password === data.new_password) {
						ctx.addIssue({
							path: ["new_password"],
							message: t("profile.newPasswordSameAsOld"),
							code: z.ZodIssueCode.custom,
						});
					}
					if (data.new_password && data.confirm_password && data.new_password !== data.confirm_password) {
						ctx.addIssue({
							path: ["confirm_password"],
							message: t("profile.passwordMismatch"),
							code: z.ZodIssueCode.custom,
						});
					}
				}),
		[t],
	);

	const form = useForm<PasswordFormValues>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(passwordSchema) as any,
		mode: "onBlur",
		reValidateMode: "onChange",
		defaultValues: {
			old_password: "",
			new_password: "",
			confirm_password: "",
		},
	});

	const mutation = useMutation({
		mutationFn: changePassword,
		onSuccess: () => {
			toast.success(t("profile.changePasswordSuccess"));
			form.reset();
			setVisibility({
				old_password: false,
				new_password: false,
				confirm_password: false,
			});
		},
		onError: (error: Error) => {
			toast.error(error.message || t("profile.changePasswordFailed"));
		},
	});

	const toggleVisibility = (name: PasswordFieldName) => {
		setVisibility((prev) => ({ ...prev, [name]: !prev[name] }));
	};

	const passwordFields: ReadonlyArray<{
		name: PasswordFieldName;
		label: string;
		placeholder: string;
		autoComplete: string;
		enterKeyHint: "next" | "done";
		description?: string;
	}> = [
		{
			name: "old_password",
			label: t("profile.oldPassword"),
			placeholder: t("profile.oldPasswordPlaceholder"),
			autoComplete: "current-password",
			enterKeyHint: "next",
		},
		{
			name: "new_password",
			label: t("profile.newPassword"),
			placeholder: t("profile.newPasswordPlaceholder"),
			autoComplete: "new-password",
			enterKeyHint: "next",
			description: t("profile.newPasswordHint"),
		},
		{
			name: "confirm_password",
			label: t("profile.confirmPassword"),
			placeholder: t("profile.confirmPasswordPlaceholder"),
			autoComplete: "new-password",
			enterKeyHint: "done",
		},
	];

	return (
		<Form {...form}>
			<form
				aria-labelledby={headingId}
				onSubmit={form.handleSubmit((values) =>
					mutation.mutate({
						old_password: values.old_password,
						new_password: values.new_password,
					}),
				)}
				className="space-y-5"
			>
				{passwordFields.map((item) => {
					const isVisible = visibility[item.name];
					return (
						<FormField
							key={item.name}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{item.label} <span aria-hidden="true">*</span>
									</FormLabel>
									<div className="relative">
										{/* FormControl 直接包裹 Input，确保 id / aria-describedby / aria-invalid 绑定到原生 input */}
										<FormControl>
											<Input
												{...field}
												type={isVisible ? "text" : "password"}
												required
												autoComplete={item.autoComplete}
												enterKeyHint={item.enterKeyHint}
												placeholder={item.placeholder}
												className="pr-10"
											/>
										</FormControl>
										<button
											type="button"
											aria-pressed={isVisible}
											aria-label={isVisible ? t("profile.hidePassword") : t("profile.showPassword")}
											onClick={() => toggleVisibility(item.name)}
											className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
										>
											{isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
										</button>
									</div>
									{item.description && <FormDescription>{item.description}</FormDescription>}
									<FormMessage />
								</FormItem>
							)}
						/>
					);
				})}

				<div className="flex items-center justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={() => form.reset()} disabled={mutation.isPending}>
						{t("profile.reset")}
					</Button>
					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? t("common.saving") : t("profile.savePassword")}
					</Button>
				</div>
			</form>
		</Form>
	);
}
