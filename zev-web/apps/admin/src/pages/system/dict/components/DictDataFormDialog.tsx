import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { Switch } from "@zev/ui/components/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createDictData, type DictData, updateDictData } from "@/api/system/dict";

interface DictDataFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingDictData: DictData | null;
	dictType: string;
	onSuccess: () => void;
}

export function DictDataFormDialog({
	open,
	onOpenChange,
	editingDictData,
	dictType,
	onSuccess,
}: DictDataFormDialogProps) {
	const [formData, setFormData] = useState({
		label: "",
		value: "",
		sort: 0,
		status: 0,
		remark: "",
	});

	useEffect(() => {
		if (open) {
			if (editingDictData) {
				setFormData({
					label: editingDictData.label,
					value: editingDictData.value,
					sort: editingDictData.sort,
					status: editingDictData.status,
					remark: editingDictData.remark,
				});
			} else {
				setFormData({ label: "", value: "", sort: 0, status: 0, remark: "" });
			}
		}
	}, [open, editingDictData]);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingDictData) {
			updateMutation.mutate({
				ID: editingDictData.ID,
				dict_type: dictType,
				...formData,
			} as Partial<DictData>);
		} else {
			createMutation.mutate({
				dict_type: dictType,
				...formData,
			} as Partial<DictData>);
		}
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

			<form onSubmit={handleSubmit} className="space-y-4 mt-6">
				<div className="space-y-2">
					<Label htmlFor="label">数据标签</Label>
					<Input
						id="label"
						value={formData.label}
						onChange={(e) => setFormData({ ...formData, label: e.target.value })}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="value">数据键值</Label>
					<Input
						id="value"
						value={formData.value}
						onChange={(e) => setFormData({ ...formData, value: e.target.value })}
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
