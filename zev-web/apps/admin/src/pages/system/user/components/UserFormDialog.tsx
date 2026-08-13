import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { getRoleList } from "@/api/system/role";
import { createUser, type User, updateUser } from "@/api/system/user";

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingUser: User | null;
	onSuccess: () => void;
}

const getUserSchema = (isEditing: boolean) =>
	z.object({
		username: z.string().min(2, "用户名至少需要2个字符").max(32, "用户名不能超过32个字符"),
		password: isEditing ? z.string().optional() : z.string().min(6, "密码至少需要6个字符"),
		nickname: z.string().min(2, "昵称至少需要2个字符"),
		email: z.string().email("无效的电子邮件格式").or(z.literal("")),
		role_id: z.number().min(1, "必须选择一个角色"),
		status: z.number().default(0),
	});

type UserFormData = {
	username: string;
	password?: string;
	nickname: string;
	email: string;
	role_id: number;
	status: number;
};

export function UserFormDialog({ open, onOpenChange, editingUser, onSuccess }: UserFormDialogProps) {
	const controls = useAnimation();
	const form = useForm<UserFormData>({
		// biome-ignore lint/suspicious/noExplicitAny: third-party type mismatch
		resolver: zodResolver(getUserSchema(!!editingUser)) as any,
		defaultValues: {
			username: "",
			password: "",
			nickname: "",
			email: "",
			role_id: 1,
			status: 0,
		},
	});

	const { data: roleData } = useQuery({
		queryKey: ["roles"],
		queryFn: () => getRoleList({ page: 1, pageSize: 1000 }),
	});
	const roles = roleData?.list || [];

	useEffect(() => {
		if (open) {
			if (editingUser) {
				form.reset({
					username: editingUser.username,
					password: "",
					nickname: editingUser.nickname,
					email: editingUser.email || "",
					role_id: editingUser.role_id,
					status: editingUser.status ?? 0,
				});
			} else {
				form.reset({ username: "", password: "", nickname: "", email: "", role_id: 1, status: 0 });
			}
		}
	}, [open, editingUser, form]);

	const createMutation = useMutation({
		mutationFn: createUser,
		onSuccess: () => {
			toast.success("用户创建成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "创建用户失败");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			toast.success("用户更新成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "更新用户失败");
		},
	});

	const onSubmit = (values: UserFormData) => {
		if (editingUser) {
			updateMutation.mutate({
				ID: editingUser.ID,
				...values,
				...(values.password ? { password: values.password } : { password: undefined }),
			} as Partial<User>);
		} else {
			createMutation.mutate(values as Partial<User>);
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
				<h2 className="text-lg font-semibold leading-none tracking-tight">{editingUser ? "编辑用户" : "添加用户"}</h2>
				<p className="text-sm text-muted-foreground">
					{editingUser ? "更新用户的详细信息。" : "填写详细信息以创建新用户。"}
				</p>
			</div>

			<Form {...form}>
				<motion.form animate={controls} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-6">
					<FormField
						control={form.control}
						name="username"
						render={({ field }) => (
							<FormItem>
								<FormLabel>用户名</FormLabel>
								<FormControl>
									<Input placeholder="输入用户名" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									密码 {editingUser && <span className="text-muted-foreground text-xs">(留空则不修改)</span>}
								</FormLabel>
								<FormControl>
									<Input type="password" placeholder="输入密码" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="nickname"
						render={({ field }) => (
							<FormItem>
								<FormLabel>昵称</FormLabel>
								<FormControl>
									<Input placeholder="输入昵称" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>邮箱</FormLabel>
								<FormControl>
									<Input type="email" placeholder="user@example.com" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="role_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>角色</FormLabel>
									<Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="选择角色" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{roles.map((role) => (
												<SelectItem key={role.ID} value={String(role.ID)}>
													{role.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>状态</FormLabel>
									<Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="选择状态" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="0">正常</SelectItem>
											<SelectItem value="1">禁用</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

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
