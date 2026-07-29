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
import { createDictType, type DictType, updateDictType } from "@/api/system/dict";

interface DictTypeFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingDictType: DictType | null;
	onSuccess: () => void;
}

const dictTypeSchema = z.object({
	name: z.string().min(2, "字典名称至少需要2个字符").max(32, "字典名称不能超过32个字符"),
	type: z.string().min(2, "字典类型至少需要2个字符"),
	status: z.number().default(0),
	remark: z.string().optional(),
});

export function DictTypeFormDialog({ open, onOpenChange, editingDictType, onSuccess }: DictTypeFormDialogProps) {
	const controls = useAnimation();
	const form = useForm<z.infer<typeof dictTypeSchema>>({
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
			toast.success("字典类型创建成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "创建字典类型失败");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateDictType,
		onSuccess: () => {
			toast.success("字典类型更新成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "更新字典类型失败");
		},
	});

	const onSubmit = (values: z.infer<typeof dictTypeSchema>) => {
		if (editingDictType) {
			updateMutation.mutate({
				ID: editingDictType.ID,
				...values,
			} as Partial<DictType>);
		} else {
			createMutation.mutate(values as Partial<DictType>);
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
					{editingDictType ? "编辑字典类型" : "添加字典类型"}
				</h2>
				<p className="text-sm text-muted-foreground">
					{editingDictType ? "更新字典类型的详细信息。" : "填写详细信息以创建新字典类型。"}
				</p>
			</div>

			<Form {...form}>
				<motion.form animate={controls} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>字典名称</FormLabel>
								<FormControl>
									<Input placeholder="输入字典名称" {...field} />
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
								<FormLabel>字典类型</FormLabel>
								<FormControl>
									<Input placeholder="输入字典类型" {...field} />
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
