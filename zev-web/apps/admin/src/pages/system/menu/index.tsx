import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { deleteMenu, getMenuTree, type Menu } from "@/api/system/menu";
import { MenuFormDialog } from "./components/MenuFormDialog";

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

	const handleAdd = (parentId: number = 0) => {
		setEditingMenu(null);
		setCurrentParentId(parentId);
		setIsDialogOpen(true);
	};

	const handleEdit = (menu: Menu) => {
		setEditingMenu(menu);
		setIsDialogOpen(true);
	};

	const handleDelete = (id: number) => {
		if (window.confirm("确定要删除此菜单吗？")) {
			deleteMutation.mutate(id);
		}
	};

	const renderTree = (menus: Menu[], level: number = 0) => {
		return menus.map((menu) => (
			<Fragment key={menu.ID}>
				<TableRow>
					<TableCell>
						<div style={{ paddingLeft: `${level * 20}px` }} className="flex items-center gap-2">
							{menu.children && menu.children.length > 0 ? (
								<span className="text-muted-foreground w-4 text-center">▾</span>
							) : (
								<span className="w-4"></span>
							)}
							{menu.name}
						</div>
					</TableCell>
					<TableCell>{menu.icon}</TableCell>
					<TableCell>{menu.path}</TableCell>
					<TableCell>{menu.component}</TableCell>
					<TableCell>{menu.perms}</TableCell>
					<TableCell>{menu.sort}</TableCell>
					<TableCell className="text-right space-x-2">
						<Button variant="outline" size="icon" onClick={() => handleAdd(menu.ID)} title="添加子菜单">
							<Plus className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="icon" onClick={() => handleEdit(menu)} title="编辑">
							<Edit className="h-4 w-4" />
						</Button>
						<Button variant="destructive" size="icon" onClick={() => handleDelete(menu.ID)} title="删除">
							<Trash2 className="h-4 w-4" />
						</Button>
					</TableCell>
				</TableRow>
				{menu.children && menu.children.length > 0 && renderTree(menu.children, level + 1)}
			</Fragment>
		));
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">菜单管理</h1>
				<Button onClick={() => handleAdd(0)}>
					<Plus className="mr-2 h-4 w-4" />
					添加菜单
				</Button>
			</div>

			<Card className="rounded-md shadow-sm border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>菜单名称</TableHead>
							<TableHead>图标</TableHead>
							<TableHead>路由路径</TableHead>
							<TableHead>组件路径</TableHead>
							<TableHead>权限标识</TableHead>
							<TableHead>排序</TableHead>
							<TableHead className="text-right">操作</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={7} className="text-center h-24">
									加载中...
								</TableCell>
							</TableRow>
						) : !menuTree || menuTree.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
									暂无菜单数据。
								</TableCell>
							</TableRow>
						) : (
							renderTree(menuTree)
						)}
					</TableBody>
				</Table>
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
