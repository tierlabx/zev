import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { Switch } from "@zev/ui/components/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createRole, type Role, updateRole } from "@/api/system/role";

interface RoleFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingRole: Role | null;
	onSuccess: () => void;
}

export function RoleFormDialog({ open, onOpenChange, editingRole, onSuccess }: RoleFormDialogProps) {
	const [formData, setFormData] = useState({
		name: "",
		code: "",
		status: 0,
		sort: 0,
		desc: "",
	});

	useEffect(() => {
		if (open) {
			if (editingRole) {
				setFormData({
					name: editingRole.name,
					code: editingRole.code,
					status: editingRole.status,
					sort: editingRole.sort,
					desc: editingRole.desc,
				});
			} else {
				setFormData({ name: "", code: "", status: 0, sort: 0, desc: "" });
			}
		}
	}, [open, editingRole]);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingRole) {
			updateMutation.mutate({
				ID: editingRole.ID,
				...formData,
			} as Partial<Role>);
		} else {
			createMutation.mutate({
				...formData,
			} as Partial<Role>);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">{editingRole ? "编辑角色" : "添加角色"}</h2>
				<p className="text-sm text-muted-foreground">
					{editingRole ? "更新角色的详细信息。" : "填写详细信息以创建新角色。"}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4 mt-6">
				<div className="space-y-2">
					<Label htmlFor="name">角色名称</Label>
					<Input
						id="name"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="code">角色编码</Label>
					<Input
						id="code"
						value={formData.code}
						onChange={(e) => setFormData({ ...formData, code: e.target.value })}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="sort">排序</Label>
					<Input
						id="sort"
						type="number"
						value={formData.sort}
						onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="desc">描述</Label>
					<Input id="desc" value={formData.desc} onChange={(e) => setFormData({ ...formData, desc: e.target.value })} />
				</div>
				<div className="flex items-center space-x-2 pt-2">
					<Switch
						id="status"
						checked={formData.status === 0}
						onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 0 : 1 })}
					/>
					<Label htmlFor="status">{formData.status === 0 ? "正常" : "停用"}</Label>
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
