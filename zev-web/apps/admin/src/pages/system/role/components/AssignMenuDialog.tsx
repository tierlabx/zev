import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMenuTree, type Menu } from "@/api/system/menu";
import { assignRoleMenus, getRoleMenus } from "@/api/system/role";

interface AssignMenuDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	roleId: number | null;
	onSuccess: () => void;
}

export function AssignMenuDialog({ open, onOpenChange, roleId, onSuccess }: AssignMenuDialogProps) {
	const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(new Set());

	// Fetch all menus
	const { data: menuTree, isLoading: isMenusLoading } = useQuery({
		queryKey: ["menus"],
		queryFn: getMenuTree,
		enabled: open,
	});

	// Fetch selected menus for role
	const { data: roleMenus, isLoading: isRoleMenusLoading } = useQuery({
		queryKey: ["roleMenus", roleId],
		queryFn: () => getRoleMenus(roleId as number),
		enabled: open && roleId !== null,
	});

	useEffect(() => {
		if (open && roleMenus) {
			setSelectedMenuIds(new Set(roleMenus));
		} else if (!open) {
			setSelectedMenuIds(new Set());
		}
	}, [open, roleMenus]);

	const assignMutation = useMutation({
		mutationFn: (menuIds: number[]) => assignRoleMenus(roleId as number, menuIds),
		onSuccess: () => {
			toast.success("菜单分配成功");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "分配菜单失败");
		},
	});

	const handleSubmit = () => {
		if (roleId === null) return;
		assignMutation.mutate(Array.from(selectedMenuIds));
	};

	const handleToggle = (menuId: number, checked: boolean) => {
		const newSelected = new Set(selectedMenuIds);
		if (checked) {
			newSelected.add(menuId);
		} else {
			newSelected.delete(menuId);
		}
		setSelectedMenuIds(newSelected);
	};

	const renderTree = (menus: Menu[], level: number = 0) => {
		return menus.map((menu) => (
			<div key={menu.ID} className="flex flex-col">
				<div className="flex items-center space-x-2 py-1" style={{ paddingLeft: `${level * 24}px` }}>
					<input
						type="checkbox"
						id={`menu-${menu.ID}`}
						checked={selectedMenuIds.has(menu.ID)}
						onChange={(e) => handleToggle(menu.ID, e.target.checked)}
						className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<label htmlFor={`menu-${menu.ID}`} className="text-sm cursor-pointer select-none">
						{menu.name}
					</label>
				</div>
				{menu.children && menu.children.length > 0 && renderTree(menu.children, level + 1)}
			</div>
		));
	};

	const isLoading = isMenusLoading || isRoleMenusLoading;

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">分配菜单</h2>
				<p className="text-sm text-muted-foreground">为角色配置可访问的菜单权限。</p>
			</div>

			<div className="mt-4 max-h-[60vh] overflow-y-auto border rounded-md p-4 bg-gray-50/50">
				{isLoading ? (
					<div className="text-center text-sm text-muted-foreground py-8">加载中...</div>
				) : menuTree && menuTree.length > 0 ? (
					renderTree(menuTree)
				) : (
					<div className="text-center text-sm text-muted-foreground py-8">暂无菜单数据</div>
				)}
			</div>

			<div className="pt-4 flex justify-end">
				<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
					取消
				</Button>
				<Button onClick={handleSubmit} disabled={assignMutation.isPending || isLoading}>
					{assignMutation.isPending ? "保存中..." : "保存"}
				</Button>
			</div>
		</Modal>
	);
}
