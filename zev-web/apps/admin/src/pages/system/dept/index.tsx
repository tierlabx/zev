import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { ChevronDown, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { type Dept, type DeptTreeNode, deleteDept, getDeptTree } from "@/api/system/dept";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { collectAllNodeIds, type FlattenedTreeNode, flattenTreeWithLevel } from "@/utils/tree";
import { DeptFormDialog } from "./components/DeptFormDialog";

type FlattenedDept = FlattenedTreeNode<DeptTreeNode>;

export default function DeptManagement() {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();

	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 300);
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
	const [initialized, setInitialized] = useState(false);

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingDept, setEditingDept] = useState<Dept | null>(null);
	const [currentParentId, setCurrentParentId] = useState(0);

	const { data: deptTree = [], isLoading } = useQuery({
		queryKey: ["depts", debouncedSearch],
		queryFn: () => getDeptTree(debouncedSearch ? { keyword: debouncedSearch } : undefined),
	});

	useEffect(() => {
		if (deptTree.length > 0 && !initialized) {
			setExpandedIds(new Set(collectAllNodeIds(deptTree)));
			setInitialized(true);
		}
	}, [deptTree, initialized]);

	const toggleExpand = useCallback((id: number) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const allDeptIds = useMemo(() => collectAllNodeIds(deptTree), [deptTree]);
	const allExpanded = allDeptIds.length > 0 && allDeptIds.every((id) => expandedIds.has(id));

	const toggleExpandAll = useCallback(() => {
		if (allExpanded) {
			setExpandedIds(new Set());
		} else {
			setExpandedIds(new Set(allDeptIds));
		}
	}, [allExpanded, allDeptIds]);

	const deleteMutation = useMutation({
		mutationFn: deleteDept,
		onSuccess: () => {
			toast.success(t("dept.deleteSuccess"));
			queryClient.invalidateQueries({ queryKey: ["depts"] });
			queryClient.invalidateQueries({ queryKey: ["deptOptions"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dept.deleteFailed"));
		},
	});

	const handleAdd = useCallback(
		(parentId?: number) => {
			const fallbackRoot = deptTree[0]?.ID ?? 0;
			setEditingDept(null);
			setCurrentParentId(parentId ?? fallbackRoot);
			setIsDialogOpen(true);
		},
		[deptTree],
	);

	const handleEdit = useCallback((dept: Dept) => {
		setEditingDept(dept);
		setIsDialogOpen(true);
	}, []);

	const handleDelete = useCallback(
		(id: number) => {
			confirm(t("dept.deleteConfirm"), () => {
				deleteMutation.mutate(id);
			});
		},
		[confirm, deleteMutation, t],
	);

	const flattenedDepts = useMemo(
		() => flattenTreeWithLevel(deptTree, debouncedSearch ? undefined : expandedIds),
		[deptTree, debouncedSearch, expandedIds],
	);

	const columns = useMemo<ColumnDef<FlattenedDept>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("dept.name"),
				size: 240,
				cell: ({ row }) => {
					const isExpanded = debouncedSearch !== "" || expandedIds.has(row.original.ID);
					return (
						<div style={{ paddingLeft: `${row.original.level * 20}px` }} className="flex items-center gap-1.5">
							{row.original.hasChildren ? (
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
								<span className="w-5" />
							)}
							<span className="font-medium">{row.original.name}</span>
						</div>
					);
				},
			},
			{
				accessorKey: "code",
				header: t("dept.code"),
			},
			{
				accessorKey: "leader",
				header: t("dept.leader"),
				cell: ({ row }) => row.original.leader || "-",
			},
			{
				accessorKey: "phone",
				header: t("dept.phone"),
				cell: ({ row }) => row.original.phone || "-",
			},
			{
				accessorKey: "sort",
				header: t("common.sort"),
				size: 80,
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				size: 100,
				cell: ({ row }) =>
					row.original.status === 1 ? (
						<Badge variant="destructive">{t("common.stopped")}</Badge>
					) : (
						<Badge
							variant="default"
							className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20 shadow-none"
						>
							{t("common.normal")}
						</Badge>
					),
			},
			{
				accessorKey: "CreatedAt",
				header: t("common.createdAt"),
				cell: ({ row }) => new Date(row.original.CreatedAt).toLocaleString(locale),
			},
			{
				id: "actions",
				header: t("common.actions"),
				size: 150,
				meta: { fixed: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						<Auth permission="system:dept:create">
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleAdd(row.original.ID)}
								title={t("dept.addChildDept")}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</Auth>
						<Auth permission="system:dept:update">
							<Button variant="outline" size="icon" onClick={() => handleEdit(row.original)} title={t("common.edit")}>
								<Edit className="h-4 w-4" />
							</Button>
						</Auth>
						<Auth permission="system:dept:delete">
							<Button
								variant="destructive"
								size="icon"
								onClick={() => handleDelete(row.original.ID)}
								title={t("common.delete")}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</Auth>
					</div>
				),
			},
		],
		[t, locale, debouncedSearch, expandedIds, toggleExpand, handleAdd, handleEdit, handleDelete],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
			<ZevTable
				columns={columns}
				data={flattenedDepts}
				isLoading={isLoading}
				className="flex-1 min-h-0"
				pagination={false}
				toolbarLeft={
					<>
						<Input
							placeholder={t("dept.searchPlaceholder")}
							className="h-8 w-[240px]"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<Button type="button" variant="outline" size="sm" className="h-8" onClick={toggleExpandAll}>
							{allExpanded ? t("common.collapseAll") : t("common.expandAll")}
						</Button>
					</>
				}
				toolbarRight={
					<Auth permission="system:dept:create">
						<Button size="sm" className="h-8" onClick={() => handleAdd()}>
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							{t("dept.addDept")}
						</Button>
					</Auth>
				}
			/>

			<DeptFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingDept={editingDept}
				parentId={currentParentId}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["depts"] });
					queryClient.invalidateQueries({ queryKey: ["deptOptions"] });
				}}
			/>
			<ConfirmDialog />
		</div>
	);
}
