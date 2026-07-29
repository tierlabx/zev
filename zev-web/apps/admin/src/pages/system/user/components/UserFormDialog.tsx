import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getRoleList } from "@/api/system/role";
import { createUser, type User, updateUser } from "@/api/system/user";

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingUser: User | null;
	onSuccess: () => void;
}

export function UserFormDialog({ open, onOpenChange, editingUser, onSuccess }: UserFormDialogProps) {
	const [formData, setFormData] = useState({
		username: "",
		password: "",
		nickname: "",
		email: "",
		role_id: 1,
		status: 0,
	});

	const { data: roleData } = useQuery({
		queryKey: ["roles"],
		queryFn: () => getRoleList({ page: 1, pageSize: 1000 }),
	});
	const roles = roleData?.list || [];

	useEffect(() => {
		if (open) {
			if (editingUser) {
				setFormData({
					username: editingUser.username,
					password: "",
					nickname: editingUser.nickname,
					email: editingUser.email || "",
					role_id: editingUser.role_id,
					status: editingUser.status ?? 0,
				});
			} else {
				setFormData({ username: "", password: "", nickname: "", email: "", role_id: 1, status: 0 });
			}
		}
	}, [open, editingUser]);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingUser) {
			updateMutation.mutate({
				ID: editingUser.ID,
				username: formData.username,
				nickname: formData.nickname,
				email: formData.email,
				role_id: Number(formData.role_id),
				status: Number(formData.status),
				...(formData.password ? { password: formData.password } : {}),
			} as Partial<User>);
		} else {
			createMutation.mutate({
				...formData,
				role_id: Number(formData.role_id),
				status: Number(formData.status),
			} as Partial<User>);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">{editingUser ? "编辑用户" : "添加用户"}</h2>
				<p className="text-sm text-muted-foreground">
					{editingUser ? "更新用户的详细信息。" : "填写详细信息以创建新用户。"}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4 mt-6">
				<div className="space-y-2">
					<Label htmlFor="username">用户名</Label>
					<Input
						id="username"
						value={formData.username}
						onChange={(e) => setFormData({ ...formData, username: e.target.value })}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">
						密码 {editingUser && <span className="text-muted-foreground text-xs">(留空则不修改)</span>}
					</Label>
					<Input
						id="password"
						type="password"
						value={formData.password}
						onChange={(e) => setFormData({ ...formData, password: e.target.value })}
						required={!editingUser}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="nickname">昵称</Label>
					<Input
						id="nickname"
						value={formData.nickname}
						onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">邮箱</Label>
					<Input
						id="email"
						type="email"
						value={formData.email}
						onChange={(e) => setFormData({ ...formData, email: e.target.value })}
						placeholder="user@example.com"
					/>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="role_id">角色</Label>
						<Select
							key={`${editingUser ? editingUser.ID : "new"}-${roles.length}`}
							value={String(formData.role_id)}
							onValueChange={(val) => setFormData({ ...formData, role_id: Number(val) })}
						>
							<SelectTrigger>
								<SelectValue placeholder="选择角色" />
							</SelectTrigger>
							<SelectContent>
								{roles.map((role) => (
									<SelectItem key={role.ID} value={String(role.ID)}>
										{role.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="status">状态</Label>
						<Select
							value={String(formData.status)}
							onValueChange={(val) => setFormData({ ...formData, status: Number(val) })}
						>
							<SelectTrigger>
								<SelectValue placeholder="选择状态" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="0">正常</SelectItem>
								<SelectItem value="1">禁用</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="pt-4 flex justify-end">
					<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
						{createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
