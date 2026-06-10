import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteMenu, getMenuTree, type Menu } from "@/api/system/menu";
import { ZevTable } from "@/components/zev-table";
import { MenuFormDialog } from "./components/MenuFormDialog";

interface FlattenedMenu extends Menu {
	level: number;
}

const flattenTree = (menus: Menu[], level: number = 0): FlattenedMenu[] => {
	let result: FlattenedMenu[] = [];
	menus.forEach((menu) => {
		result.push({ ...menu, level });
		if (menu.children && menu.children.length > 0) {
			result = result.concat(flattenTree(menu.children, level + 1));
		}
	});
	return result;
};

export default function MenuManagement() {
	const queryClient = useQueryClient();

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

	const [currentParentId, setCurrentParentId] = useState(0);

	const { data: menuTree, isLoading } = useQuery({
		queryKey: ["menus"],
		queryFn: getMenuTree,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteMenu,
		onSuccess: () => {
			toast.success("菜单删除成功");
			queryClient.invalidateQueries({ queryKey: ["menus"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "删除菜单失败");
		},
	});

	const handleAdd = useCallback((parentId: number = 0) => {
		setEditingMenu(null);
		setCurrentParentId(parentId);
		setIsDialogOpen(true);
	}, []);

	const handleEdit = useCallback((menu: Menu) => {
		setEditingMenu(menu);
		setIsDialogOpen(true);
	}, []);

	const handleDelete = useCallback(
		(id: number) => {
			if (window.confirm("确定要删除此菜单吗？")) {
				deleteMutation.mutate(id);
			}
		},
		[deleteMutation],
	);

	const flattenedMenus = useMemo(() => {
		if (!menuTree) return [];
		return flattenTree(menuTree);
	}, [menuTree]);

	const columns = useMemo<ColumnDef<FlattenedMenu>[]>(
		() => [
			{
				accessorKey: "name",
				header: "菜单名称",
				cell: ({ row }) => (
					<div style={{ paddingLeft: `${row.original.level * 20}px` }} className="flex items-center gap-2">
						{row.original.children && row.original.children.length > 0 ? (
							<span className="text-muted-foreground w-4 text-center">▾</span>
						) : (
							<span className="w-4"></span>
						)}
						{row.original.name}
					</div>
				),
			},
			{ accessorKey: "icon", header: "图标" },
			{ accessorKey: "path", header: "路由路径" },
			{ accessorKey: "component", header: "组件路径" },
			{ accessorKey: "perms", header: "权限标识" },
			{ accessorKey: "sort", header: "排序" },
			{
				id: "actions",
				header: () => <div className="text-right">操作</div>,
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						<Button variant="outline" size="icon" onClick={() => handleAdd(row.original.ID)} title="添加子菜单">
							<Plus className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="icon" onClick={() => handleEdit(row.original as Menu)} title="编辑">
							<Edit className="h-4 w-4" />
						</Button>
						<Button variant="destructive" size="icon" onClick={() => handleDelete(row.original.ID)} title="删除">
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[handleAdd, handleEdit, handleDelete],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-end">
				<Button onClick={() => handleAdd(0)}>
					<Plus className="mr-2 h-4 w-4" />
					添加菜单
				</Button>
			</div>

			<Card className="rounded-md shadow-sm border p-4">
				<ZevTable columns={columns} data={flattenedMenus} isLoading={isLoading} containerHeight="calc(100vh - 200px)" />
			</Card>

			<MenuFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingMenu={editingMenu}
				parentId={currentParentId}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["menus"] })}
			/>
		</div>
	);
}
