import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Switch } from "@zev/ui/components/switch";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createDictData, type DictData, updateDictData } from "@/api/system/dict";

interface DictDataFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingDictData: DictData | null;
	dictType: string;
	onSuccess: () => void;
}

const dictDataSchema = z.object({
	label: z.string().min(1, "数据标签不能为空").max(32, "数据标签不能超过32个字符"),
	value: z.string().min(1, "数据键值不能为空"),
	sort: z.number().default(0),
	status: z.number().default(0),
	remark: z.string().optional(),
});

export function DictDataFormDialog({
	open,
	onOpenChange,
	editingDictData,
	dictType,
	onSuccess,
}: DictDataFormDialogProps) {
	const controls = useAnimation();
	const form = useForm<z.infer<typeof dictDataSchema>>({
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
			toast.success("字典数据创建成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "创建字典数据失败");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateDictData,
		onSuccess: () => {
			toast.success("字典数据更新成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "更新字典数据失败");
		},
	});

	const onSubmit = (values: z.infer<typeof dictDataSchema>) => {
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
					{editingDictData ? "编辑字典数据" : "添加字典数据"}
				</h2>
				<p className="text-sm text-muted-foreground">
					{editingDictData ? "更新字典数据的详细信息。" : `在字典类型 "${dictType}" 下创建新数据。`}
				</p>
			</div>

			<Form {...form}>
				<motion.form animate={controls} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="label"
						render={({ field }) => (
							<FormItem>
								<FormLabel>数据标签</FormLabel>
								<FormControl>
									<Input placeholder="输入数据标签" {...field} />
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
								<FormLabel>数据键值</FormLabel>
								<FormControl>
									<Input placeholder="输入数据键值" {...field} />
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
								<FormLabel>排序</FormLabel>
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
								<FormLabel>备注</FormLabel>
								<FormControl>
									<Input placeholder="输入备注" {...field} />
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
									<FormLabel>{field.value === 0 ? "正常" : "停用"}</FormLabel>
								</div>
								<FormControl>
									<Switch checked={field.value === 0} onCheckedChange={(checked) => field.onChange(checked ? 0 : 1)} />
								</FormControl>
							</FormItem>
						)}
					/>

					<div className="pt-4 flex justify-end">
						<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
							取消
						</Button>
						<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
							{createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
						</Button>
					</div>
				</motion.form>
			</Form>
		</Modal>
	);
}
