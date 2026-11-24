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
import { createDictType, type DictType, updateDictType } from "@/api/system/dict";
import { useShake } from "@/hooks/use-shake";
import { useI18n } from "@/i18n";

interface DictTypeFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingDictType: DictType | null;
	onSuccess: () => void;
}

type DictTypeFormData = {
	name: string;
	type: string;
	status: number;
	remark?: string;
};

export function DictTypeFormDialog({ open, onOpenChange, editingDictType, onSuccess }: DictTypeFormDialogProps) {
	const { t } = useI18n();
	const { scope: formRef, shake } = useShake();
	const dictTypeSchema = useMemo(
		() =>
			z.object({
				name: z.string().min(2, t("dict.typeNameMin")).max(32, t("dict.typeNameMax")),
				type: z.string().min(2, t("dict.typeCodeMin")),
				status: z.number().default(0),
				remark: z.string().optional(),
			}),
		[t],
	);

	const form = useForm<DictTypeFormData>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(dictTypeSchema) as any,
		defaultValues: {
			name: "",
			type: "",
			status: 0,
			remark: "",
		},
	});

	useEffect(() => {
		if (open) {
			if (editingDictType) {
				form.reset({
					name: editingDictType.name,
					type: editingDictType.type,
					status: editingDictType.status,
					remark: editingDictType.remark || "",
				});
			} else {
				form.reset({ name: "", type: "", status: 0, remark: "" });
			}
		}
	}, [open, editingDictType, form]);

	const createMutation = useMutation({
		mutationFn: createDictType,
		onSuccess: () => {
			toast.success(t("dict.createTypeSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dict.createTypeFailed"));
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateDictType,
		onSuccess: () => {
			toast.success(t("dict.updateTypeSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dict.updateTypeFailed"));
		},
	});

	const onSubmit = (values: DictTypeFormData) => {
		if (editingDictType) {
			updateMutation.mutate({
				ID: editingDictType.ID,
				...values,
			} as Partial<DictType>);
		} else {
			createMutation.mutate(values as Partial<DictType>);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">
					{editingDictType ? t("dict.editType") : t("dict.addTypeTitle")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{editingDictType ? t("dict.editTypeDesc") : t("dict.addTypeDesc")}
				</p>
			</div>

			<Form {...form}>
				<form ref={formRef} onSubmit={form.handleSubmit(onSubmit, shake)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("dict.name")}</FormLabel>
								<FormControl>
									<Input placeholder={t("dict.namePlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("dict.type")}</FormLabel>
								<FormControl>
									<Input placeholder={t("dict.typePlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="remark"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("common.remark")}</FormLabel>
								<FormControl>
									<Input placeholder={t("dict.remarkPlaceholder")} {...field} />
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
