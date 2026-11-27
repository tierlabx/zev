import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@zev/ui/components/tabs";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createMenu, type Menu, updateMenu } from "@/api/system/menu";
import { useShake } from "@/hooks/use-shake";
import { useI18n } from "@/i18n";
import { collectDescendantIds } from "@/utils/tree";
import { MenuComponentSelect } from "./MenuComponentSelect";
import { MenuIconPicker } from "./MenuIconPicker";
import { MenuParentSelect } from "./MenuParentSelect";

type MenuType = "M" | "C" | "F";

interface MenuFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingMenu: Menu | null;
	parentId: number;
	menus: Menu[];
	onSuccess: () => void;
}

function normalizeMenuType(type?: string): MenuType {
	if (type === "M" || type === "C" || type === "F") {
		return type;
	}
	return "C";
}

export function MenuFormDialog({ open, onOpenChange, editingMenu, parentId, menus, onSuccess }: MenuFormDialogProps) {
	const { t } = useI18n();
	const { scope: formRef, shake } = useShake();

	const menuSchema = useMemo(
		() =>
			z
				.object({
					parent_id: z.number(),
					type: z.enum(["M", "C", "F"]),
					name: z.string().min(1, t("menuPage.nameRequired")),
					path: z.string().optional(),
					component: z.string().optional(),
					icon: z.string().optional(),
					sort: z.number(),
					perms: z.string().optional(),
				})
				.superRefine((data, ctx) => {
					if (data.type === "C" && (!data.path || data.path.trim() === "")) {
						ctx.addIssue({
							path: ["path"],
							message: t("menuPage.pathRequired"),
							code: z.ZodIssueCode.custom,
						});
					}
					if (data.type === "C" && (!data.component || data.component.trim() === "")) {
						ctx.addIssue({
							path: ["component"],
							message: t("menuPage.componentRequired"),
							code: z.ZodIssueCode.custom,
						});
					}
					if (data.type === "F" && (!data.perms || data.perms.trim() === "")) {
						ctx.addIssue({
							path: ["perms"],
							message: t("menuPage.permsRequired"),
							code: z.ZodIssueCode.custom,
						});
					}
				}),
		[t],
	);

	type MenuFormData = z.infer<typeof menuSchema>;

	const form = useForm<MenuFormData>({
		resolver: zodResolver(menuSchema),
		defaultValues: {
			parent_id: 0,
			name: "",
			path: "",
			component: "",
			icon: "",
			sort: 0,
			type: "C",
			perms: "",
		},
	});

	const selectedType = form.watch("type");

	// 编辑时禁止将自身及子孙节点设为上级菜单，防止树成环
	const disabledParentIds = useMemo(() => {
		if (!editingMenu) return new Set<number>();
		return collectDescendantIds(menus, editingMenu.ID);
	}, [menus, editingMenu]);

	useEffect(() => {
		if (!open) return;
		if (editingMenu) {
			form.reset({
				parent_id: editingMenu.parent_id,
				name: editingMenu.name,
				path: editingMenu.path || "",
				component: editingMenu.component || "",
				icon: editingMenu.icon || "",
				sort: editingMenu.sort,
				type: normalizeMenuType(editingMenu.type),
				perms: editingMenu.perms || "",
			});
		} else {
			form.reset({
				parent_id: parentId,
				name: "",
				path: "",
				component: "",
				icon: "",
				sort: 0,
				type: parentId > 0 ? "C" : "M",
				perms: "",
			});
		}
	}, [open, editingMenu, parentId, form]);

	const createMutation = useMutation({
		mutationFn: createMenu,
		onSuccess: () => {
			toast.success(t("menuPage.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("menuPage.createFailed"));
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateMenu,
		onSuccess: () => {
			toast.success(t("menuPage.updateSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("menuPage.updateFailed"));
		},
	});

	const onSubmit = (values: MenuFormData) => {
		// 提交时按当前菜单类型清洗无关字段，同时保留切 Tab 过程中已填写的表单输入
		const payload: Partial<Menu> = {
			...values,
			path: values.type === "F" ? "" : (values.path ?? "").trim(),
			component: values.type === "C" ? (values.component ?? "").trim() : "",
			icon: values.type === "F" ? "" : (values.icon ?? "").trim(),
			perms: values.type === "M" ? "" : (values.perms ?? "").trim(),
		};

		if (editingMenu) {
			updateMutation.mutate({
				ID: editingMenu.ID,
				...payload,
			});
		} else {
			createMutation.mutate(payload);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)} modalSize="xl">
			<div className="mb-4 flex flex-col space-y-1 text-center sm:text-left">
				<h2 className="text-lg font-semibold leading-none tracking-tight">
					{editingMenu ? t("menuPage.editMenu") : t("menuPage.addMenu")}
				</h2>
				<p className="text-sm text-muted-foreground">{editingMenu ? t("menuPage.editDesc") : t("menuPage.addDesc")}</p>
			</div>

			<Form {...form}>
				<form ref={formRef} onSubmit={form.handleSubmit(onSubmit, shake)} className="space-y-4">
					{/* 菜单类型 Tab 切换，对应下方配置字段联动 */}
					<FormField
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("menuPage.type")}</FormLabel>
								<FormControl>
									<Tabs
										value={field.value}
										onValueChange={(nextType) => {
											if (nextType === "M" || nextType === "C" || nextType === "F") {
												field.onChange(nextType);
												form.clearErrors();
											}
										}}
									>
										<TabsList className="grid w-full grid-cols-3">
											<TabsTrigger value="M">{t("menuPage.typeDir")}</TabsTrigger>
											<TabsTrigger value="C">{t("menuPage.typeMenu")}</TabsTrigger>
											<TabsTrigger value="F">{t("menuPage.typeButton")}</TabsTrigger>
										</TabsList>
									</Tabs>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="parent_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("menuPage.parentMenu")}</FormLabel>
									<FormControl>
										<MenuParentSelect
											value={field.value}
											onChange={field.onChange}
											menus={menus}
											disabledIds={disabledParentIds}
											menuType={selectedType}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("menuPage.name")}</FormLabel>
									<FormControl>
										<Input
											placeholder={
												selectedType === "M"
													? t("menuPage.namePlaceholderDir")
													: selectedType === "C"
														? t("menuPage.namePlaceholderMenu")
														: t("menuPage.namePlaceholderButton")
											}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{selectedType === "M" && (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="path"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("menuPage.path")}</FormLabel>
										<FormControl>
											<Input placeholder={t("menuPage.pathPlaceholderDir")} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="icon"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("menuPage.icon")}</FormLabel>
										<FormControl>
											<MenuIconPicker value={field.value} onChange={field.onChange} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="sort"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("common.sort")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												value={field.value}
												onChange={(e) => field.onChange(Number(e.target.value) || 0)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}

					{selectedType === "C" && (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="path"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("menuPage.path")}</FormLabel>
										<FormControl>
											<Input placeholder={t("menuPage.pathPlaceholderMenu")} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="component"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("menuPage.component")}</FormLabel>
										<FormControl>
											<MenuComponentSelect value={field.value} onChange={field.onChange} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="perms"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("menuPage.perms")}</FormLabel>
										<FormControl>
											<Input placeholder={t("menuPage.permsPlaceholder")} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="icon"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("menuPage.icon")}</FormLabel>
										<FormControl>
											<MenuIconPicker value={field.value} onChange={field.onChange} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="sort"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("common.sort")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												value={field.value}
												onChange={(e) => field.onChange(Number(e.target.value) || 0)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}

					{selectedType === "F" && (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="perms"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("menuPage.perms")}</FormLabel>
										<FormControl>
											<Input placeholder={t("menuPage.permsPlaceholder")} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="sort"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("common.sort")}</FormLabel>
										<FormControl>
											<Input
												type="number"
												value={field.value}
												onChange={(e) => field.onChange(Number(e.target.value) || 0)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}

					<div className="flex justify-end pt-2">
						<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? t("common.saving") : t("common.save")}
						</Button>
					</div>
				</form>
			</Form>
		</Modal>
	);
}
