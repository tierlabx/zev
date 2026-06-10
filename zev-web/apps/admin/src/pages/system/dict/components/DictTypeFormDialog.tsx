import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { Switch } from "@zev/ui/components/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createDictType, type DictType, updateDictType } from "@/api/system/dict";

interface DictTypeFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingDictType: DictType | null;
	onSuccess: () => void;
}

export function DictTypeFormDialog({ open, onOpenChange, editingDictType, onSuccess }: DictTypeFormDialogProps) {
	const [formData, setFormData] = useState({
		name: "",
		type: "",
		status: 0,
		remark: "",
	});

	useEffect(() => {
		if (open) {
			if (editingDictType) {
				setFormData({
					name: editingDictType.name,
					type: editingDictType.type,
					status: editingDictType.status,
					remark: editingDictType.remark,
				});
			} else {
				setFormData({ name: "", type: "", status: 0, remark: "" });
			}
		}
	}, [open, editingDictType]);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingDictType) {
			updateMutation.mutate({
				ID: editingDictType.ID,
				...formData,
			} as Partial<DictType>);
		} else {
			createMutation.mutate({
				...formData,
			} as Partial<DictType>);
		}
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

			<form onSubmit={handleSubmit} className="space-y-4 mt-6">
				<div className="space-y-2">
					<Label htmlFor="name">字典名称</Label>
					<Input
						id="name"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="type">字典类型</Label>
					<Input
						id="type"
						value={formData.type}
						onChange={(e) => setFormData({ ...formData, type: e.target.value })}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="remark">备注</Label>
					<Input
						id="remark"
						value={formData.remark}
						onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
					/>
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
