import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createMenu, type Menu, updateMenu } from "@/api/system/menu";

interface MenuFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingMenu: Menu | null;
	parentId: number;
	onSuccess: () => void;
}

export function MenuFormDialog({ open, onOpenChange, editingMenu, parentId, onSuccess }: MenuFormDialogProps) {
	const [formData, setFormData] = useState<Partial<Menu>>({
		parent_id: 0,
		name: "",
		path: "",
		component: "",
		icon: "",
		sort: 0,
		type: "C",
		perms: "",
	});

	useEffect(() => {
		if (open) {
			if (editingMenu) {
				setFormData({
					parent_id: editingMenu.parent_id,
					name: editingMenu.name,
					path: editingMenu.path,
					component: editingMenu.component,
					icon: editingMenu.icon,
					sort: editingMenu.sort,
					type: editingMenu.type,
					perms: editingMenu.perms,
				});
			} else {
				setFormData({
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
	}, [open, editingMenu, parentId]);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingMenu) {
			updateMutation.mutate({
				ID: editingMenu.ID,
				...formData,
			});
		} else {
			createMutation.mutate(formData);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">{editingMenu ? "编辑菜单" : "添加菜单"}</h2>
				<p className="text-sm text-muted-foreground">
					{editingMenu ? "更新菜单配置信息。" : "填写详细信息以创建新菜单。"}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4 mt-6">
				<div className="space-y-2">
					<Label htmlFor="type">菜单类型</Label>
					<select
						id="type"
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						value={formData.type}
						onChange={(e) => setFormData({ ...formData, type: e.target.value })}
					>
						<option value="M">目录</option>
						<option value="C">菜单</option>
						<option value="F">按钮</option>
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="name">菜单名称</Label>
					<Input
						id="name"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
						placeholder={
							formData.type === "M" ? "如：系统管理" : formData.type === "C" ? "如：用户管理" : "如：新增用户"
						}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="parent_id">父级 ID</Label>
					<Input
						id="parent_id"
						type="number"
						value={formData.parent_id}
						onChange={(e) => setFormData({ ...formData, parent_id: Number(e.target.value) })}
						required
					/>
				</div>

				{formData.type !== "F" && (
					<div className="space-y-2">
						<Label htmlFor="path">路由路径</Label>
						<Input
							id="path"
							value={formData.path}
							onChange={(e) => setFormData({ ...formData, path: e.target.value })}
							required={formData.type === "C"}
							placeholder={formData.type === "M" ? "如：/system" : "如：/system/user"}
						/>
					</div>
				)}

				{formData.type === "C" && (
					<div className="space-y-2">
						<Label htmlFor="component">组件路径</Label>
						<Input
							id="component"
							value={formData.component}
							onChange={(e) => setFormData({ ...formData, component: e.target.value })}
							required
							placeholder="如：system/user/index"
						/>
					</div>
				)}

				{formData.type !== "M" && (
					<div className="space-y-2">
						<Label htmlFor="perms">权限标识</Label>
						<Input
							id="perms"
							value={formData.perms}
							onChange={(e) => setFormData({ ...formData, perms: e.target.value })}
							required={formData.type === "F"}
							placeholder="如：system:user:add"
						/>
					</div>
				)}

				{formData.type !== "F" && (
					<div className="space-y-2">
						<Label htmlFor="icon">图标</Label>
						<Input
							id="icon"
							value={formData.icon}
							onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
							placeholder="如：Settings"
						/>
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="sort">排序</Label>
					<Input
						id="sort"
						type="number"
						value={formData.sort}
						onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}
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
			</form>
		</Modal>
	);
}
