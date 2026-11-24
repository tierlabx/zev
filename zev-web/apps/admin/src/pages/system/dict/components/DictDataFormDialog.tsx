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
import { createDictData, type DictData, updateDictData } from "@/api/system/dict";
import { useShake } from "@/hooks/use-shake";
import { useI18n } from "@/i18n";

interface DictDataFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingDictData: DictData | null;
	dictType: string;
	onSuccess: () => void;
}

type DictDataFormData = {
	label: string;
	value: string;
	sort: number;
	status: number;
	remark?: string;
};

export function DictDataFormDialog({
	open,
	onOpenChange,
	editingDictData,
	dictType,
	onSuccess,
}: DictDataFormDialogProps) {
	const { t } = useI18n();
	const { scope: formRef, shake } = useShake();
	const dictDataSchema = useMemo(
		() =>
			z.object({
				label: z.string().min(1, t("dict.dataLabelRequired")).max(32, t("dict.dataLabelMax")),
				value: z.string().min(1, t("dict.dataValueRequired")),
				sort: z.number().default(0),
				status: z.number().default(0),
				remark: z.string().optional(),
			}),
		[t],
	);

	const form = useForm<DictDataFormData>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(dictDataSchema) as any,
		defaultValues: {
			label: "",
			value: "",
			sort: 0,
			status: 0,
			remark: "",
		},
	});

	useEffect(() => {
		if (open) {
			if (editingDictData) {
				form.reset({
					label: editingDictData.label,
					value: editingDictData.value,
					sort: editingDictData.sort,
					status: editingDictData.status,
					remark: editingDictData.remark || "",
				});
			} else {
				form.reset({ label: "", value: "", sort: 0, status: 0, remark: "" });
			}
		}
	}, [open, editingDictData, form]);

	const createMutation = useMutation({
		mutationFn: createDictData,
		onSuccess: () => {
			toast.success(t("dict.createDataSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dict.createDataFailed"));
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateDictData,
		onSuccess: () => {
			toast.success(t("dict.updateDataSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dict.updateDataFailed"));
		},
	});

	const onSubmit = (values: DictDataFormData) => {
		if (editingDictData) {
			updateMutation.mutate({
				ID: editingDictData.ID,
				dict_type: dictType,
				...values,
			} as Partial<DictData>);
		} else {
			createMutation.mutate({
				dict_type: dictType,
				...values,
			} as Partial<DictData>);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">
					{editingDictData ? t("dict.editData") : t("dict.addDataTitle")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{editingDictData ? t("dict.editDataDesc") : t("dict.addDataDesc", { dictType })}
				</p>
			</div>

			<Form {...form}>
				<form ref={formRef} onSubmit={form.handleSubmit(onSubmit, shake)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="label"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("dict.label")}</FormLabel>
								<FormControl>
									<Input placeholder={t("dict.labelPlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="value"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("dict.value")}</FormLabel>
								<FormControl>
									<Input placeholder={t("dict.valuePlaceholder")} {...field} />
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
