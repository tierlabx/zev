import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@zev/ui/components/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { createMenu, deleteMenu, getMenuTree, type Menu, updateMenu } from "@/api/system/menu";

export default function MenuManagement() {
	const queryClient = useQueryClient();

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

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

	const { data: menuTree, isLoading } = useQuery({
		queryKey: ["menus"],
		queryFn: getMenuTree,
	});

	const createMutation = useMutation({
		mutationFn: createMenu,
		onSuccess: () => {
			toast.success("菜单创建成功");
			queryClient.invalidateQueries({ queryKey: ["menus"] });
			setIsSheetOpen(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "创建菜单失败");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateMenu,
		onSuccess: () => {
			toast.success("菜单更新成功");
			queryClient.invalidateQueries({ queryKey: ["menus"] });
			setIsSheetOpen(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "更新菜单失败");
		},
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
		setFormData({ parent_id: parentId, name: "", path: "", component: "", icon: "", sort: 0, type: "C", perms: "" });
		setIsSheetOpen(true);
	};

	const handleEdit = (menu: Menu) => {
		setEditingMenu(menu);
		setFormData({
			parent_id: menu.parent_id,
			name: menu.name,
			path: menu.path,
			component: menu.component,
			icon: menu.icon,
			sort: menu.sort,
			type: menu.type,
			perms: menu.perms,
		});
		setIsSheetOpen(true);
	};

	const handleDelete = (id: number) => {
		if (window.confirm("确定要删除此菜单吗？")) {
			deleteMutation.mutate(id);
		}
	};

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

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent className="overflow-y-auto">
					<SheetHeader>
						<SheetTitle>{editingMenu ? "编辑菜单" : "添加菜单"}</SheetTitle>
						<SheetDescription>{editingMenu ? "更新菜单配置信息。" : "填写详细信息以创建新菜单。"}</SheetDescription>
					</SheetHeader>

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
						<div className="space-y-2">
							<Label htmlFor="path">路由路径</Label>
							<Input
								id="path"
								value={formData.path}
								onChange={(e) => setFormData({ ...formData, path: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="component">组件路径</Label>
							<Input
								id="component"
								value={formData.component}
								onChange={(e) => setFormData({ ...formData, component: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="perms">权限标识</Label>
							<Input
								id="perms"
								value={formData.perms}
								onChange={(e) => setFormData({ ...formData, perms: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="icon">图标</Label>
							<Input
								id="icon"
								value={formData.icon}
								onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
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

						<div className="pt-4 flex justify-end">
							<Button type="button" variant="outline" className="mr-2" onClick={() => setIsSheetOpen(false)}>
								取消
							</Button>
							<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
								{createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
							</Button>
						</div>
					</form>
				</SheetContent>
			</Sheet>
		</div>
	);
}
