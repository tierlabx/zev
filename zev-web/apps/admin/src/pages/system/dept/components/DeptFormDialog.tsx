import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Switch } from "@zev/ui/components/switch";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createDept, type Dept, getDeptOptionsTree, updateDept } from "@/api/system/dept";
import { DeptSelect } from "@/components/dept-tree-select";
import { usePermission } from "@/hooks/use-permission";
import { useShake } from "@/hooks/use-shake";
import { useI18n } from "@/i18n";
import { collectDescendantIds } from "@/utils/tree";

interface DeptFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingDept: Dept | null;
	parentId: number;
	onSuccess: () => void;
}

export function DeptFormDialog({ open, onOpenChange, editingDept, parentId, onSuccess }: DeptFormDialogProps) {
	const { t } = useI18n();
	const { hasAllDataScope } = usePermission();
	const { scope: formRef, shake } = useShake();

	const deptSchema = useMemo(
		() =>
			z.object({
				parent_id: z.number().min(0),
				name: z.string().min(1, t("dept.nameRequired")).max(50, t("dept.nameMax")),
				code: z.string().min(1, t("dept.codeRequired")).max(50, t("dept.codeMax")),
				leader: z.string().max(50),
				phone: z.string().max(20),
				email: z.string().email(t("dept.emailInvalid")).or(z.literal("")),
				sort: z.number(),
				status: z.number(),
			}),
		[t],
	);

	type DeptFormValues = z.infer<typeof deptSchema>;

	const form = useForm<DeptFormValues>({
		resolver: zodResolver(deptSchema),
		defaultValues: {
			parent_id: 0,
			name: "",
			code: "",
			leader: "",
			phone: "",
			email: "",
			sort: 0,
			status: 0,
		},
	});

	const { data: deptOptions = [] } = useQuery({
		queryKey: ["deptOptions"],
		queryFn: getDeptOptionsTree,
		enabled: open,
	});

	const disabledParentIds = useMemo(() => {
		if (!editingDept) return new Set<number>();
		return collectDescendantIds(deptOptions, editingDept.ID);
	}, [deptOptions, editingDept]);

	useEffect(() => {
		if (!open) return;
		if (editingDept) {
			form.reset({
				parent_id: editingDept.parent_id,
				name: editingDept.name,
				code: editingDept.code,
				leader: editingDept.leader || "",
				phone: editingDept.phone || "",
				email: editingDept.email || "",
				sort: editingDept.sort,
				status: editingDept.status,
			});
		} else {
			form.reset({
				parent_id: parentId,
				name: "",
				code: "",
				leader: "",
				phone: "",
				email: "",
				sort: 0,
				status: 0,
			});
		}
	}, [open, editingDept, parentId, form]);

	const createMutation = useMutation({
		mutationFn: createDept,
		onSuccess: () => {
			toast.success(t("dept.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dept.createFailed"));
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateDept,
		onSuccess: () => {
			toast.success(t("dept.updateSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dept.updateFailed"));
		},
	});

	const onSubmit = (values: DeptFormValues) => {
		if (editingDept) {
			updateMutation.mutate({ ID: editingDept.ID, ...values });
		} else {
			createMutation.mutate(values);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">
					{editingDept ? t("dept.editDept") : t("dept.addDept")}
				</h2>
				<p className="text-sm text-muted-foreground">{editingDept ? t("dept.editDesc") : t("dept.addDesc")}</p>
			</div>

			<Form {...form}>
				<form ref={formRef} onSubmit={form.handleSubmit(onSubmit, shake)} className="space-y-4 mt-4">
					<FormField
						control={form.control}
						name="parent_id"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("dept.parentDept")}</FormLabel>
								<FormControl>
									<DeptSelect
										value={field.value}
										onChange={field.onChange}
										depts={deptOptions}
										disabledIds={disabledParentIds}
										includeRootOption={hasAllDataScope}
										rootLabel={t("dept.topLevelDept")}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("dept.name")}</FormLabel>
									<FormControl>
										<Input placeholder={t("dept.namePlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("dept.code")}</FormLabel>
									<FormControl>
										<Input placeholder={t("dept.codePlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="leader"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("dept.leader")}</FormLabel>
									<FormControl>
										<Input placeholder={t("dept.leaderPlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("dept.phone")}</FormLabel>
									<FormControl>
										<Input placeholder={t("dept.phonePlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("dept.email")}</FormLabel>
									<FormControl>
										<Input placeholder={t("dept.emailPlaceholder")} {...field} />
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
										<Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
								<FormLabel>{field.value === 0 ? t("common.normal") : t("common.stopped")}</FormLabel>
								<FormControl>
									<Switch checked={field.value === 0} onCheckedChange={(checked) => field.onChange(checked ? 0 : 1)} />
								</FormControl>
							</FormItem>
						)}
					/>

					<div className="pt-2 flex justify-end">
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
