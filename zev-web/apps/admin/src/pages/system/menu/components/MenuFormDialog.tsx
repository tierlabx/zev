import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { createMenu, type Menu, updateMenu } from "@/api/system/menu";
import { useI18n } from "@/i18n";

interface MenuFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingMenu: Menu | null;
	parentId: number;
	onSuccess: () => void;
}

type MenuFormData = {
	parent_id: number;
	type: string;
	name: string;
	path?: string;
	component?: string;
	icon?: string;
	sort: number;
	perms?: string;
};

export function MenuFormDialog({ open, onOpenChange, editingMenu, parentId, onSuccess }: MenuFormDialogProps) {
	const { t } = useI18n();
	const controls = useAnimation();
	const menuSchema = useMemo(
		() =>
			z
				.object({
					parent_id: z.number(),
					type: z.string(),
					name: z.string().min(1, t("menuPage.nameRequired")),
					path: z.string().optional(),
					component: z.string().optional(),
					icon: z.string().optional(),
					sort: z.number().default(0),
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

	const form = useForm<MenuFormData>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(menuSchema) as any,
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

	useEffect(() => {
		if (open) {
			if (editingMenu) {
				form.reset({
					parent_id: editingMenu.parent_id,
					name: editingMenu.name,
					path: editingMenu.path || "",
					component: editingMenu.component || "",
					icon: editingMenu.icon || "",
					sort: editingMenu.sort,
					type: editingMenu.type,
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
					type: "C",
					perms: "",
				});
			}
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
		if (editingMenu) {
			updateMutation.mutate({
				ID: editingMenu.ID,
				...values,
			} as Partial<Menu>);
		} else {
			createMutation.mutate(values as Partial<Menu>);
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
					{editingMenu ? t("menuPage.editMenu") : t("menuPage.addMenu")}
				</h2>
				<p className="text-sm text-muted-foreground">{editingMenu ? t("menuPage.editDesc") : t("menuPage.addDesc")}</p>
			</div>

			<Form {...form}>
				<motion.form animate={controls} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("menuPage.type")}</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder={t("menuPage.selectType")} />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="M">{t("menuPage.typeDir")}</SelectItem>
										<SelectItem value="C">{t("menuPage.typeMenu")}</SelectItem>
										<SelectItem value="F">{t("menuPage.typeButton")}</SelectItem>
									</SelectContent>
								</Select>
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
					<FormField
						control={form.control}
						name="parent_id"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("menuPage.parentId")}</FormLabel>
								<FormControl>
									<Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{selectedType !== "F" && (
						<FormField
							control={form.control}
							name="path"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("menuPage.path")}</FormLabel>
									<FormControl>
										<Input
											placeholder={
												selectedType === "M" ? t("menuPage.pathPlaceholderDir") : t("menuPage.pathPlaceholderMenu")
											}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}

					{selectedType === "C" && (
						<FormField
							control={form.control}
							name="component"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("menuPage.component")}</FormLabel>
									<FormControl>
										<Input placeholder={t("menuPage.componentPlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}

					{selectedType !== "M" && (
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
					)}

					{selectedType !== "F" && (
						<FormField
							control={form.control}
							name="icon"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("menuPage.icon")}</FormLabel>
									<FormControl>
										<Input placeholder={t("menuPage.iconPlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}

					<FormField
						control={form.control}
						name="sort"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("common.sort")}</FormLabel>
								<FormControl>
									<Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

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
