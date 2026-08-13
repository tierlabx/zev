import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { ChevronDown, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteMenu, getMenuTree, type Menu } from "@/api/system/menu";
import { ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { usePermission } from "@/hooks/use-permission";
import { MenuFormDialog } from "./components/MenuFormDialog";

interface FlattenedMenu extends Menu {
	level: number;
}

const flattenTree = (menus: Menu[], expandedRowKeys: Set<number>, level: number = 0): FlattenedMenu[] => {
	let result: FlattenedMenu[] = [];
	menus.forEach((menu) => {
		result.push({ ...menu, level });
		if (expandedRowKeys.has(menu.ID) && menu.children && menu.children.length > 0) {
			result = result.concat(flattenTree(menu.children, expandedRowKeys, level + 1));
		}
	});
	return result;
};

export default function MenuManagement() {
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();
	const { hasPermission } = usePermission();

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

	const [currentParentId, setCurrentParentId] = useState(0);

	const [expandedRowKeys, setExpandedRowKeys] = useState<Set<number>>(new Set());
	const [isInitialized, setIsInitialized] = useState(false);

	const { data: menuTree, isLoading } = useQuery({
		queryKey: ["menus"],
		queryFn: getMenuTree,
	});

	useEffect(() => {
		if (menuTree && !isInitialized) {
			// Initialize by expanding only the top level (level 0)
			const topLevelIds = new Set(menuTree.map((m) => m.ID));
			setExpandedRowKeys(topLevelIds);
			setIsInitialized(true);
		}
	}, [menuTree, isInitialized]);

	const toggleExpand = useCallback((id: number) => {
		setExpandedRowKeys((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

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
			confirm("确定要删除此菜单吗？", () => {
				deleteMutation.mutate(id);
			});
		},
		[deleteMutation, confirm],
	);

	const flattenedMenus = useMemo(() => {
		if (!menuTree) return [];
		return flattenTree(menuTree, expandedRowKeys);
	}, [menuTree, expandedRowKeys]);

	const columns = useMemo<ColumnDef<FlattenedMenu>[]>(
		() => [
			{
				accessorKey: "name",
				header: "菜单名称",
				cell: ({ row }) => {
					const hasChildren = row.original.children && row.original.children.length > 0;
					const isExpanded = expandedRowKeys.has(row.original.ID);
					return (
						<div style={{ paddingLeft: `${row.original.level * 20}px` }} className="flex items-center gap-1.5">
							{hasChildren ? (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										toggleExpand(row.original.ID);
									}}
									className="p-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
								>
									{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
								</button>
							) : (
								<span className="w-5"></span>
							)}
							{row.original.name}
						</div>
					);
				},
			},
			{ accessorKey: "icon", header: "图标" },
			{ accessorKey: "path", header: "路由路径" },
			{ accessorKey: "component", header: "组件路径" },
			{ accessorKey: "perms", header: "权限标识" },
			{ accessorKey: "sort", header: "排序" },
			{
				id: "actions",
				header: "操作",
				size: 150,
				meta: { fixed: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						{hasPermission("system:menu:create") && (
							<Button variant="outline" size="icon" onClick={() => handleAdd(row.original.ID)} title="添加子菜单">
								<Plus className="h-4 w-4" />
							</Button>
						)}
						{hasPermission("system:menu:update") && (
							<Button variant="outline" size="icon" onClick={() => handleEdit(row.original as Menu)} title="编辑">
								<Edit className="h-4 w-4" />
							</Button>
						)}
						{hasPermission("system:menu:delete") && (
							<Button variant="destructive" size="icon" onClick={() => handleDelete(row.original.ID)} title="删除">
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				),
			},
		],
		[handleAdd, handleEdit, handleDelete, hasPermission, expandedRowKeys, toggleExpand],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
			<Card className="flex-1 flex flex-col rounded-md shadow-sm border p-4 min-h-0">
				<div className="flex items-center justify-between mb-4 shrink-0">
					<div />
					{hasPermission("system:menu:create") && (
						<Button onClick={() => handleAdd(0)}>
							<Plus className="mr-2 h-4 w-4" />
							添加菜单
						</Button>
					)}
				</div>
				<ZevTable
					columns={columns}
					data={flattenedMenus}
					isLoading={isLoading}
					className="flex-1 min-h-0"
					pagination={false}
				/>
			</Card>

			<MenuFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingMenu={editingMenu}
				parentId={currentParentId}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["menus"] })}
			/>
			<ConfirmDialog />
		</div>
	);
}
