import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Switch } from "@zev/ui/components/switch";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createRole, type Role, updateRole } from "@/api/system/role";
import { useShake } from "@/hooks/use-shake";
import { useI18n } from "@/i18n";

interface RoleFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingRole: Role | null;
	onSuccess: () => void;
}

type RoleFormData = {
	name: string;
	code: string;
	status: number;
	sort: number;
	desc?: string;
};

export function RoleFormDialog({ open, onOpenChange, editingRole, onSuccess }: RoleFormDialogProps) {
	const { t } = useI18n();
	const { scope: formRef, shake } = useShake();
	const roleSchema = useMemo(
		() =>
			z.object({
				name: z.string().min(2, t("role.nameMin")).max(32, t("role.nameMax")),
				code: z.string().min(2, t("role.codeMin")),
				status: z.number().default(0),
				sort: z.number().default(0),
				desc: z.string().optional(),
			}),
		[t],
	);

	const form = useForm<RoleFormData>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(roleSchema) as any,
		defaultValues: {
			name: "",
			code: "",
			status: 0,
			sort: 0,
			desc: "",
		},
	});

	useEffect(() => {
		if (open) {
			if (editingRole) {
				form.reset({
					name: editingRole.name,
					code: editingRole.code,
					status: editingRole.status,
					sort: editingRole.sort,
					desc: editingRole.desc || "",
				});
			} else {
				form.reset({ name: "", code: "", status: 0, sort: 0, desc: "" });
			}
		}
	}, [open, editingRole, form]);

	const createMutation = useMutation({
		mutationFn: createRole,
		onSuccess: () => {
			toast.success(t("role.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("role.createFailed"));
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateRole,
		onSuccess: () => {
			toast.success(t("role.updateSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("role.updateFailed"));
		},
	});

	const onSubmit = (values: RoleFormData) => {
		if (editingRole) {
			updateMutation.mutate({
				ID: editingRole.ID,
				...values,
			} as Partial<Role>);
		} else {
			createMutation.mutate(values as Partial<Role>);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">
					{editingRole ? t("role.editRole") : t("role.addRole")}
				</h2>
				<p className="text-sm text-muted-foreground">{editingRole ? t("role.editDesc") : t("role.addDesc")}</p>
			</div>

			<Form {...form}>
				<form ref={formRef} onSubmit={form.handleSubmit(onSubmit, shake)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("role.name")}</FormLabel>
								<FormControl>
									<Input placeholder={t("role.namePlaceholder")} {...field} />
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
								<FormLabel>{t("role.code")}</FormLabel>
								<FormControl>
									<Input placeholder={t("role.codePlaceholder")} {...field} />
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
					<FormField
						control={form.control}
						name="desc"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("common.description")}</FormLabel>
								<FormControl>
									<Input placeholder={t("role.descPlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
								<div className="space-y-0.5">
									<FormLabel>{field.value === 0 ? t("common.normal") : t("common.stopped")}</FormLabel>
								</div>
								<FormControl>
									<Switch checked={field.value === 0} onCheckedChange={(checked) => field.onChange(checked ? 0 : 1)} />
								</FormControl>
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
				</form>
			</Form>
		</Modal>
	);
}
