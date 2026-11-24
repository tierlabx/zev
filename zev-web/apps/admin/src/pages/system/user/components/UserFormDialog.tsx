import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { getDeptTree } from "@/api/system/dept";
import { getRoleList } from "@/api/system/role";
import { createUser, type User, updateUser } from "@/api/system/user";
import { DeptSelect } from "@/components/dept-tree-select";
import { Checkbox } from "@/components/zev-table/checkbox";
import { usePermission } from "@/hooks/use-permission";
import { useShake } from "@/hooks/use-shake";
import { useI18n } from "@/i18n";

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingUser: User | null;
	defaultDeptId?: number;
	onSuccess: () => void;
}

export function UserFormDialog({ open, onOpenChange, editingUser, defaultDeptId = 0, onSuccess }: UserFormDialogProps) {
	const { t } = useI18n();
	const { isSuperAdmin } = usePermission();
	const { scope: formRef, shake } = useShake();

	const userSchema = useMemo(
		() =>
			z.object({
				username: z.string().min(2, t("user.usernameMin")).max(32, t("user.usernameMax")),
				password: editingUser ? z.string() : z.string().min(6, t("user.passwordMin")),
				nickname: z.string().min(2, t("user.nicknameMin")),
				email: z.string().email(t("user.emailInvalid")).or(z.literal("")),
				dept_id: z.number().min(1, t("user.deptRequired")),
				role_ids: z.array(z.number()).min(1, t("user.roleRequired")),
				status: z.number(),
			}),
		[editingUser, t],
	);

	type UserFormData = z.infer<typeof userSchema>;

	const form = useForm<UserFormData>({
		resolver: zodResolver(userSchema),
		defaultValues: {
			username: "",
			password: "",
			nickname: "",
			email: "",
			dept_id: 0,
			role_ids: [],
			status: 0,
		},
	});

	const { data: roleData } = useQuery({
		queryKey: ["roles"],
		queryFn: () => getRoleList({ page: 1, pageSize: 1000 }),
		enabled: open,
	});
	const { data: deptTree = [] } = useQuery({
		queryKey: ["depts"],
		queryFn: () => getDeptTree(),
		enabled: open,
	});

	const roles = useMemo(() => roleData?.list ?? [], [roleData]);
	const selectableRoles = useMemo(
		() => roles.filter((r) => isSuperAdmin || (r.ID !== 1 && r.code !== "admin")),
		[roles, isSuperAdmin],
	);
	const initializedKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!open) {
			initializedKeyRef.current = null;
			return;
		}
		if (roles.length === 0) return;

		const initKey = editingUser ? `edit-${editingUser.ID}` : `create-${defaultDeptId}`;
		if (initializedKeyRef.current === initKey) return;
		initializedKeyRef.current = initKey;

		if (editingUser) {
			const existingRoleIds =
				editingUser.role_ids && editingUser.role_ids.length > 0
					? editingUser.role_ids
					: editingUser.role_id > 0
						? [editingUser.role_id]
						: [];
			form.reset({
				username: editingUser.username,
				password: "",
				nickname: editingUser.nickname,
				email: editingUser.email || "",
				dept_id: editingUser.dept_id || deptTree[0]?.ID || 0,
				role_ids: existingRoleIds,
				status: editingUser.status ?? 0,
			});
		} else {
			const initialDeptId = defaultDeptId > 0 ? defaultDeptId : (deptTree[0]?.ID ?? 0);
			const defaultRoleId = roles.find((r) => r.code === "common")?.ID ?? selectableRoles[0]?.ID;
			form.reset({
				username: "",
				password: "",
				nickname: "",
				email: "",
				dept_id: initialDeptId,
				role_ids: defaultRoleId ? [defaultRoleId] : [],
				status: 0,
			});
		}
	}, [open, editingUser, defaultDeptId, deptTree, roles, selectableRoles, form]);

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
		const payload = {
			username: values.username,
			nickname: values.nickname,
			email: values.email,
			dept_id: values.dept_id,
			role_id: values.role_ids[0] ?? 0,
			role_ids: values.role_ids,
			status: values.status,
			...(values.password ? { password: values.password } : {}),
		};
		if (editingUser) {
			updateMutation.mutate({
				ID: editingUser.ID,
				...payload,
			});
		} else {
			createMutation.mutate(payload);
		}
	};

	const isSuperTarget = editingUser?.ID === 1;

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">
					{editingUser ? t("user.editUser") : t("user.addUser")}
				</h2>
				<p className="text-sm text-muted-foreground">{editingUser ? t("user.editDesc") : t("user.addDesc")}</p>
			</div>

			<Form {...form}>
				<form ref={formRef} onSubmit={form.handleSubmit(onSubmit, shake)} className="space-y-4 mt-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="dept_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("user.dept")}</FormLabel>
									<FormControl>
										<DeptSelect
											value={field.value}
											onChange={field.onChange}
											depts={deptTree}
											placeholder={t("user.selectDept")}
										/>
									</FormControl>
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
									<Select
										disabled={isSuperTarget}
										onValueChange={(val) => field.onChange(Number(val))}
										value={String(field.value)}
									>
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

					<FormField
						control={form.control}
						name="role_ids"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("user.role")}</FormLabel>
								<div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 bg-muted/30 max-h-36 overflow-y-auto">
									{selectableRoles.map((role) => {
										const checked = field.value.includes(role.ID);
										const disabled = isSuperTarget && (role.ID === 1 || role.code === "admin");
										const checkboxId = `user-form-role-${role.ID}`;
										return (
											<div
												key={role.ID}
												className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted/70"
											>
												<Checkbox
													id={checkboxId}
													checked={checked}
													disabled={disabled}
													onCheckedChange={(next) => {
														if (next === true) {
															field.onChange([...field.value, role.ID]);
														} else {
															field.onChange(field.value.filter((id) => id !== role.ID));
														}
													}}
												/>
												<label htmlFor={checkboxId} className="truncate flex-1 cursor-pointer select-none">
													{role.name}
												</label>
											</div>
										);
									})}
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="pt-2 flex justify-end">
						<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
							{createMutation.isPending || updateMutation.isPending ? t("common.saving") : t("common.save")}
						</Button>
					</div>
				</form>
			</Form>
		</Modal>
	);
}
