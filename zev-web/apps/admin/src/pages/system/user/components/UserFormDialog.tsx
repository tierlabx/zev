import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { getRoleList } from "@/api/system/role";
import { createUser, type User, updateUser } from "@/api/system/user";
import { useI18n } from "@/i18n";

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingUser: User | null;
	onSuccess: () => void;
}

type UserFormData = {
	username: string;
	password?: string;
	nickname: string;
	email: string;
	role_id: number;
	status: number;
};

export function UserFormDialog({ open, onOpenChange, editingUser, onSuccess }: UserFormDialogProps) {
	const { t } = useI18n();
	const controls = useAnimation();
	const userSchema = useMemo(
		() =>
			z.object({
				username: z.string().min(2, t("user.usernameMin")).max(32, t("user.usernameMax")),
				password: editingUser ? z.string().optional() : z.string().min(6, t("user.passwordMin")),
				nickname: z.string().min(2, t("user.nicknameMin")),
				email: z.string().email(t("user.emailInvalid")).or(z.literal("")),
				role_id: z.number().min(1, t("user.roleRequired")),
				status: z.number().default(0),
			}),
		[editingUser, t],
	);

	const form = useForm<UserFormData>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(userSchema) as any,
		defaultValues: {
			username: "",
			password: "",
			nickname: "",
			email: "",
			role_id: 1,
			status: 0,
		},
	});

	const { data: roleData } = useQuery({
		queryKey: ["roles"],
		queryFn: () => getRoleList({ page: 1, pageSize: 1000 }),
	});
	const roles = roleData?.list || [];

	useEffect(() => {
		if (open) {
			if (editingUser) {
				form.reset({
					username: editingUser.username,
					password: "",
					nickname: editingUser.nickname,
					email: editingUser.email || "",
					role_id: editingUser.role_id,
					status: editingUser.status ?? 0,
				});
			} else {
				form.reset({ username: "", password: "", nickname: "", email: "", role_id: 1, status: 0 });
			}
		}
	}, [open, editingUser, form]);

	const createMutation = useMutation({
		mutationFn: createUser,
		onSuccess: () => {
			toast.success(t("user.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("user.createFailed"));
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			toast.success(t("user.updateSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("user.updateFailed"));
		},
	});

	const onSubmit = (values: UserFormData) => {
		if (editingUser) {
			updateMutation.mutate({
				ID: editingUser.ID,
				...values,
				...(values.password ? { password: values.password } : { password: undefined }),
			} as Partial<User>);
		} else {
			createMutation.mutate(values as Partial<User>);
		}
	};

	const onInvalid = () => {
		controls.start({
			x: [0, -10, 10, -10, 10, -5, 5, 0],
			transition: { duration: 0.4 },
		});
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">
					{editingUser ? t("user.editUser") : t("user.addUser")}
				</h2>
				<p className="text-sm text-muted-foreground">{editingUser ? t("user.editDesc") : t("user.addDesc")}</p>
			</div>

			<Form {...form}>
				<motion.form animate={controls} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="username"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("user.username")}</FormLabel>
								<FormControl>
									<Input placeholder={t("user.usernamePlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("user.password")}{" "}
									{editingUser && <span className="text-muted-foreground text-xs">{t("user.passwordKeepHint")}</span>}
								</FormLabel>
								<FormControl>
									<Input type="password" placeholder={t("user.passwordPlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="nickname"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("user.nickname")}</FormLabel>
								<FormControl>
									<Input placeholder={t("user.nicknamePlaceholder")} {...field} />
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
								<FormLabel>{t("user.email")}</FormLabel>
								<FormControl>
									<Input type="email" placeholder={t("user.emailPlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="role_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("user.role")}</FormLabel>
									<Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder={t("user.selectRole")} />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{roles.map((role) => (
												<SelectItem key={role.ID} value={String(role.ID)}>
													{role.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("user.status")}</FormLabel>
									<Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder={t("user.selectStatus")} />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="0">{t("common.normal")}</SelectItem>
											<SelectItem value="1">{t("common.disabled")}</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="pt-4 flex justify-end">
						<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
							{createMutation.isPending || updateMutation.isPending ? t("common.saving") : t("common.save")}
						</Button>
					</div>
				</motion.form>
			</Form>
		</Modal>
	);
}
