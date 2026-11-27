import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { ChevronDown, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getUserInfoApi } from "@/api/system/auth";
import { deleteMenu, getMenuTree, type Menu } from "@/api/system/menu";
import { ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { usePermission } from "@/hooks/use-permission";
import { useI18n } from "@/i18n";
import { syncRouterRoutes } from "@/router/session";
import { useUserStore } from "@/store";
import { getMenuIcon } from "@/utils/menu-icons";
import { MenuFormDialog } from "./components/MenuFormDialog";
import { splitPermKeys } from "./components/MenuPermCascader";

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
	const { t } = useI18n();
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

	const syncMenuChanges = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["menus"] }),
			queryClient.invalidateQueries({ queryKey: ["menuPermOptions"] }),
		]);
		try {
			const info = await getUserInfoApi();
			useUserStore.getState().setUserInfo(info);
			syncRouterRoutes(info.menus ?? []);
		} catch {
			// 菜单同步失败不影响当前配置页的主流程提示
		}
	}, [queryClient]);

	const deleteMutation = useMutation({
		mutationFn: deleteMenu,
		onSuccess: () => {
			toast.success(t("menuPage.deleteSuccess"));
			void syncMenuChanges();
		},
		onError: (error: Error) => {
			toast.error(error.message || t("menuPage.deleteFailed"));
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
			confirm(t("menuPage.deleteConfirm"), () => {
				deleteMutation.mutate(id);
			});
		},
		[deleteMutation, confirm, t],
	);

	const flattenedMenus = useMemo(() => {
		if (!menuTree) return [];
		return flattenTree(menuTree, expandedRowKeys);
	}, [menuTree, expandedRowKeys]);

	const columns = useMemo<ColumnDef<FlattenedMenu>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("menuPage.name"),
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
									className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
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
			{
				accessorKey: "icon",
				header: t("menuPage.icon"),
				cell: ({ row }) => {
					const iconName = row.original.icon;
					if (!iconName) {
						return <span className="text-muted-foreground">-</span>;
					}
					const IconComp = getMenuIcon(iconName);
					return (
						<div className="flex items-center gap-2">
							<IconComp className="h-4 w-4 shrink-0 text-muted-foreground" />
							<span className="font-mono text-xs text-muted-foreground">{iconName}</span>
						</div>
					);
				},
			},
			{ accessorKey: "path", header: t("menuPage.path") },
			{ accessorKey: "component", header: t("menuPage.component") },
			{
				accessorKey: "perms",
				header: t("menuPage.perms"),
				cell: ({ row }) => {
					const perms = splitPermKeys(row.original.perms);
					if (perms.length === 0) {
						return <span className="text-muted-foreground">-</span>;
					}
					return (
						<div className="flex flex-wrap gap-1">
							{perms.map((permKey) => (
								<Badge key={permKey} variant="secondary" className="px-1.5 py-0 font-mono text-[11px] font-normal">
									{permKey}
								</Badge>
							))}
						</div>
					);
				},
			},
			{ accessorKey: "sort", header: t("common.sort") },
			{
				id: "actions",
				header: t("common.actions"),
				size: 150,
				meta: { fixed: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						{hasPermission("system:menu:create") && (
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleAdd(row.original.ID)}
								title={t("menuPage.addChildMenu")}
							>
								<Plus className="h-4 w-4" />
							</Button>
						)}
						{hasPermission("system:menu:update") && (
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleEdit(row.original as Menu)}
								title={t("common.edit")}
							>
								<Edit className="h-4 w-4" />
							</Button>
						)}
						{hasPermission("system:menu:delete") && (
							<Button
								variant="destructive"
								size="icon"
								onClick={() => handleDelete(row.original.ID)}
								title={t("common.delete")}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				),
			},
		],
		[handleAdd, handleEdit, handleDelete, hasPermission, expandedRowKeys, toggleExpand, t],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
			<ZevTable
				columns={columns}
				data={flattenedMenus}
				isLoading={isLoading}
				className="flex-1 min-h-0"
				pagination={false}
				toolbarRight={
					hasPermission("system:menu:create") ? (
						<Button size="sm" className="h-8" onClick={() => handleAdd(0)}>
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							{t("menuPage.addMenu")}
						</Button>
					) : null
				}
			/>

			<MenuFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingMenu={editingMenu}
				parentId={currentParentId}
				menus={menuTree ?? []}
				onSuccess={() => void syncMenuChanges()}
			/>
			<ConfirmDialog />
		</div>
	);
}
