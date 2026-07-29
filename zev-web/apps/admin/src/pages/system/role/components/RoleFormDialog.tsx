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
import { createRole, type Role, updateRole } from "@/api/system/role";

interface RoleFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingRole: Role | null;
	onSuccess: () => void;
}

const roleSchema = z.object({
	name: z.string().min(2, "角色名称至少需要2个字符").max(32, "角色名称不能超过32个字符"),
	code: z.string().min(2, "角色编码至少需要2个字符"),
	status: z.number().default(0),
	sort: z.number().default(0),
	desc: z.string().optional(),
});

type RoleFormData = {
	name: string;
	code: string;
	status: number;
	sort: number;
	desc?: string;
};

export function RoleFormDialog({ open, onOpenChange, editingRole, onSuccess }: RoleFormDialogProps) {
	const controls = useAnimation();
	const form = useForm<RoleFormData>({
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
			toast.success("角色创建成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "创建角色失败");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateRole,
		onSuccess: () => {
			toast.success("角色更新成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "更新角色失败");
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

	const onInvalid = () => {
		controls.start({
			x: [0, -10, 10, -10, 10, -5, 5, 0],
			transition: { duration: 0.4 },
		});
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">{editingRole ? "编辑角色" : "添加角色"}</h2>
				<p className="text-sm text-muted-foreground">
					{editingRole ? "更新角色的详细信息。" : "填写详细信息以创建新角色。"}
				</p>
			</div>

			<Form {...form}>
				<motion.form animate={controls} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>角色名称</FormLabel>
								<FormControl>
									<Input placeholder="输入角色名称" {...field} />
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
								<FormLabel>角色编码</FormLabel>
								<FormControl>
									<Input placeholder="输入角色编码" {...field} />
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
						name="desc"
						render={({ field }) => (
							<FormItem>
								<FormLabel>描述</FormLabel>
								<FormControl>
									<Input placeholder="输入描述" {...field} />
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
