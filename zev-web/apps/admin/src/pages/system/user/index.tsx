import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { cn } from "@zev/ui/lib/utils";
import { Building2, ChevronDown, ChevronRight, Edit, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { type DeptTreeNode, getDeptTree } from "@/api/system/dept";
import { getRoleList } from "@/api/system/role";
import { deleteUser, getUserList, type User } from "@/api/system/user";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";
import { collectAllNodeIds, filterTreeByKeyword } from "@/utils/tree";
import { AssignUserRoleDialog } from "./components/AssignUserRoleDialog";
import { UserFormDialog } from "./components/UserFormDialog";

export default function UserManagement() {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const currentUserId = useUserStore((state) => state.userInfo?.id ?? 0);

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [selectedDeptId, setSelectedDeptId] = useState<number>(0);
	const [deptSearch, setDeptSearch] = useState("");
	const [expandedDeptIds, setExpandedDeptIds] = useState<Set<number>>(new Set());
	const [deptTreeInitialized, setDeptTreeInitialized] = useState(false);

	const { confirm, ConfirmDialog } = useConfirm();
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 300);

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);

	const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
	const [assigningUser, setAssigningUser] = useState<User | null>(null);

	const { data: deptTree = [] } = useQuery({
		queryKey: ["depts"],
		queryFn: () => getDeptTree(),
	});

	useEffect(() => {
		if (deptTree.length > 0 && !deptTreeInitialized) {
			setExpandedDeptIds(new Set(collectAllNodeIds(deptTree)));
			setDeptTreeInitialized(true);
		}
	}, [deptTree, deptTreeInitialized]);

	const filteredDeptTree = useMemo(
		() =>
			filterTreeByKeyword(
				deptTree,
				deptSearch,
				(node, kw) => node.name.toLowerCase().includes(kw) || node.code.toLowerCase().includes(kw),
			),
		[deptTree, deptSearch],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["users", page, pageSize, debouncedSearch, selectedDeptId],
		queryFn: () =>
			getUserList({
				page,
				pageSize,
				keyword: debouncedSearch,
				deptId: selectedDeptId > 0 ? selectedDeptId : undefined,
			}),
	});

	const { data: roleData } = useQuery({
		queryKey: ["roles"],
		queryFn: () => getRoleList({ page: 1, pageSize: 1000 }),
	});
	const roles = roleData?.list || [];

	const deleteMutation = useMutation({
		mutationFn: deleteUser,
		onSuccess: () => {
			toast.success(t("user.deleteSuccess"));
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || t("user.deleteFailed"));
		},
	});

	const handleAdd = useCallback(() => {
		setEditingUser(null);
		setIsDialogOpen(true);
	}, []);

	const handleEdit = useCallback((user: User) => {
		setEditingUser(user);
		setIsDialogOpen(true);
	}, []);

	const handleAssignRole = useCallback((user: User) => {
		setAssigningUser(user);
		setIsAssignRoleDialogOpen(true);
	}, []);

	const handleDelete = useCallback(
		(id: number) => {
			confirm(t("user.deleteConfirm"), () => {
				deleteMutation.mutate(id);
			});
		},
		[deleteMutation, confirm, t],
	);

	const toggleDeptExpand = useCallback((id: number) => {
		setExpandedDeptIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleSelectDept = (id: number) => {
		setSelectedDeptId(id);
		setPage(1);
	};

	const users = data?.list || [];
	const total = data?.total || 0;

	const renderDeptTree = (nodes: DeptTreeNode[], level = 0) =>
		nodes.map((node) => {
			const hasChildren = Boolean(node.children && node.children.length > 0);
			const isExpanded = deptSearch.trim() !== "" || expandedDeptIds.has(node.ID);
			const isSelected = selectedDeptId === node.ID;

			return (
				<div key={node.ID} className="flex flex-col">
					<div
						className={cn(
							"flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
							isSelected
								? "bg-accent text-accent-foreground font-medium"
								: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
						)}
						style={{ paddingLeft: `${level * 14 + 8}px` }}
					>
						{hasChildren ? (
							<button
								type="button"
								onClick={() => toggleDeptExpand(node.ID)}
								className="p-0.5 rounded hover:bg-background/60 shrink-0"
								aria-label={node.name}
							>
								{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
							</button>
						) : (
							<span className="w-4.5 shrink-0" />
						)}
						<button
							type="button"
							onClick={() => handleSelectDept(node.ID)}
							className="flex-1 text-left truncate cursor-pointer"
						>
							{node.name}
						</button>
					</div>
					{hasChildren && isExpanded && renderDeptTree(node.children, level + 1)}
				</div>
			);
		});

	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				id: "select",
				size: 40,
				header: ({ table }) => (
					<Checkbox
						checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "username",
				header: t("user.username"),
			},
			{
				accessorKey: "nickname",
				header: t("user.nickname"),
			},
			{
				accessorKey: "dept_name",
				header: t("user.dept"),
				cell: ({ row }) => row.original.dept_name || "-",
			},
			{
				accessorKey: "role_ids",
				header: t("user.role"),
				cell: ({ row }) => {
					const roleIds =
						row.original.role_ids && row.original.role_ids.length > 0
							? row.original.role_ids
							: row.original.role_id > 0
								? [row.original.role_id]
								: [];
					if (roleIds.length === 0) return "-";
					return (
						<div className="flex flex-wrap gap-1">
							{roleIds.map((rid) => {
								const role = roles.find((r) => r.ID === rid);
								return (
									<Badge key={rid} variant="secondary" className="font-normal">
										{role ? role.name : `#${rid}`}
									</Badge>
								);
							})}
						</div>
					);
				},
			},
			{
				accessorKey: "email",
				header: t("user.email"),
				cell: ({ row }) => row.original.email || "-",
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				cell: ({ row }) =>
					row.original.status === 1 ? (
						<Badge variant="destructive">{t("common.disabled")}</Badge>
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
				size: 140,
				meta: { fixed: "right" },
				cell: ({ row }) => {
					const isProtected = row.original.ID === 1 || row.original.ID === currentUserId;
					return (
						<div className="flex justify-end space-x-2">
							<Auth permission="system:user:assign">
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleAssignRole(row.original)}
									title={t("user.assignRole")}
								>
									<ShieldCheck className="h-4 w-4" />
								</Button>
							</Auth>
							<Auth permission="system:user:update">
								<Button variant="outline" size="icon" onClick={() => handleEdit(row.original)} title={t("common.edit")}>
									<Edit className="h-4 w-4" />
								</Button>
							</Auth>
							<Auth permission="system:user:delete">
								<Button
									variant="destructive"
									size="icon"
									disabled={isProtected}
									onClick={() => handleDelete(row.original.ID)}
									title={t("common.delete")}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</Auth>
						</div>
					);
				},
			},
		],
		[handleEdit, handleDelete, roles, handleAssignRole, t, locale, currentUserId],
	);

	const assigningRoleIds = assigningUser
		? assigningUser.role_ids && assigningUser.role_ids.length > 0
			? assigningUser.role_ids
			: assigningUser.role_id > 0
				? [assigningUser.role_id]
				: []
		: [];

	return (
		<div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
			{/* 左侧：组织部门筛选树 */}
			<Card className="w-full lg:w-[250px] shrink-0 flex flex-col rounded-md shadow-sm border p-3 min-h-[220px] lg:min-h-0">
				<div className="relative mb-3 shrink-0">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={deptSearch}
						onChange={(e) => setDeptSearch(e.target.value)}
						placeholder={t("dept.searchPlaceholder")}
						className="h-8 pl-8 text-xs"
					/>
				</div>

				<div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
					<button
						type="button"
						onClick={() => handleSelectDept(0)}
						className={cn(
							"w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors text-left",
							selectedDeptId === 0
								? "bg-accent text-accent-foreground font-medium"
								: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
						)}
					>
						<Building2 className="h-3.5 w-3.5 shrink-0" />
						<span className="truncate">{t("dept.allDepts")}</span>
					</button>

					{filteredDeptTree.length > 0 ? (
						renderDeptTree(filteredDeptTree)
					) : (
						<div className="py-6 text-center text-xs text-muted-foreground">{t("dept.noDepts")}</div>
					)}
				</div>
			</Card>

			{/* 右侧：用户列表 */}
			<Card className="flex-1 flex flex-col rounded-md shadow-sm border p-4 min-h-0 min-w-0">
				<div className="flex items-center justify-between mb-4 shrink-0 gap-2">
					<Input
						placeholder={t("user.searchPlaceholder")}
						className="w-[280px]"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
					<Auth permission="system:user:create">
						<Button onClick={handleAdd}>
							<Plus className="mr-2 h-4 w-4" />
							{t("user.addUser")}
						</Button>
					</Auth>
				</div>

				<ZevTable
					columns={columns}
					data={users}
					isLoading={isLoading}
					className="flex-1 min-h-0"
					pagination={true}
					page={page}
					pageSize={pageSize}
					total={total}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					enableRowSelection={true}
				/>
			</Card>

			<UserFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingUser={editingUser}
				defaultDeptId={selectedDeptId}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
			/>
			<AssignUserRoleDialog
				open={isAssignRoleDialogOpen}
				onOpenChange={setIsAssignRoleDialogOpen}
				userId={assigningUser?.ID || null}
				currentRoleIds={assigningRoleIds}
				roles={roles}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
			/>
			<ConfirmDialog />
		</div>
	);
}
