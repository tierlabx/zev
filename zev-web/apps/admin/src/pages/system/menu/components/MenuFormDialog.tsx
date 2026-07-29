import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createMenu, type Menu, updateMenu } from "@/api/system/menu";

interface MenuFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingMenu: Menu | null;
	parentId: number;
	onSuccess: () => void;
}

const menuSchema = z
	.object({
		parent_id: z.number(),
		type: z.string(),
		name: z.string().min(1, "菜单名称不能为空"),
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
				message: "菜单类型必须填写路由路径",
				code: z.ZodIssueCode.custom,
			});
		}
		if (data.type === "C" && (!data.component || data.component.trim() === "")) {
			ctx.addIssue({
				path: ["component"],
				message: "菜单类型必须填写组件路径",
				code: z.ZodIssueCode.custom,
			});
		}
		if (data.type === "F" && (!data.perms || data.perms.trim() === "")) {
			ctx.addIssue({
				path: ["perms"],
				message: "按钮类型必须填写权限标识",
				code: z.ZodIssueCode.custom,
			});
		}
	});

export function MenuFormDialog({ open, onOpenChange, editingMenu, parentId, onSuccess }: MenuFormDialogProps) {
	const controls = useAnimation();
	const form = useForm<z.infer<typeof menuSchema>>({
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
			toast.success("菜单创建成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "创建菜单失败");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateMenu,
		onSuccess: () => {
			toast.success("菜单更新成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "更新菜单失败");
		},
	});

	const onSubmit = (values: z.infer<typeof menuSchema>) => {
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
				<h2 className="text-lg font-semibold leading-none tracking-tight">{editingMenu ? "编辑菜单" : "添加菜单"}</h2>
				<p className="text-sm text-muted-foreground">
					{editingMenu ? "更新菜单配置信息。" : "填写详细信息以创建新菜单。"}
				</p>
			</div>

			<Form {...form}>
				<motion.form animate={controls} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>菜单类型</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="选择菜单类型" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="M">目录</SelectItem>
										<SelectItem value="C">菜单</SelectItem>
										<SelectItem value="F">按钮</SelectItem>
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
								<FormLabel>菜单名称</FormLabel>
								<FormControl>
									<Input
										placeholder={
											selectedType === "M" ? "如：系统管理" : selectedType === "C" ? "如：用户管理" : "如：新增用户"
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
								<FormLabel>父级 ID</FormLabel>
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
									<FormLabel>路由路径</FormLabel>
									<FormControl>
										<Input placeholder={selectedType === "M" ? "如：/system" : "如：/system/user"} {...field} />
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
									<FormLabel>组件路径</FormLabel>
									<FormControl>
										<Input placeholder="如：system/user/index" {...field} />
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
									<FormLabel>权限标识</FormLabel>
									<FormControl>
										<Input placeholder="如：system:user:add" {...field} />
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
									<FormLabel>图标</FormLabel>
									<FormControl>
										<Input placeholder="如：Settings" {...field} />
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
								<FormLabel>排序</FormLabel>
								<FormControl>
									<Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
								</FormControl>
								<FormMessage />
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
