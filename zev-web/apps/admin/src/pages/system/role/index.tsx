import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Database, Edit, MenuIcon, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { deleteRole, getRoleList, type Role } from "@/api/system/role";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { getDataScopeMeta } from "@/utils/data-scope";
import { AssignDataScopeDialog } from "./components/AssignDataScopeDialog";
import { AssignMenuDialog } from "./components/AssignMenuDialog";
import { RoleFormDialog } from "./components/RoleFormDialog";

export default function RoleManagement() {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [debouncedKeyword] = useDebounce(searchKeyword, 300);

	const { confirm, ConfirmDialog } = useConfirm();

	const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<Role | null>(null);

	const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
	const [assigningRoleId, setAssigningRoleId] = useState<number | null>(null);

	const [isDataScopeDialogOpen, setIsDataScopeDialogOpen] = useState(false);
	const [dataScopeRole, setDataScopeRole] = useState<Role | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["roles", page, pageSize, debouncedKeyword],
		queryFn: () => getRoleList({ page, pageSize, keyword: debouncedKeyword }),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteRole,
		onSuccess: () => {
			toast.success(t("role.deleteSuccess"));
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || t("role.deleteFailed"));
		},
	});

	const handleAdd = useCallback(() => {
		setEditingRole(null);
		setIsRoleDialogOpen(true);
	}, []);

	const handleEdit = useCallback((role: Role) => {
		setEditingRole(role);
		setIsRoleDialogOpen(true);
	}, []);

	const handleDelete = useCallback(
		(id: number) => {
			confirm(t("role.deleteConfirm"), () => {
				deleteMutation.mutate(id);
			});
		},
		[deleteMutation, confirm, t],
	);

	const handleAssignMenu = useCallback((id: number) => {
		setAssigningRoleId(id);
		setIsMenuDialogOpen(true);
	}, []);

	const handleAssignDataScope = useCallback((role: Role) => {
		setDataScopeRole(role);
		setIsDataScopeDialogOpen(true);
	}, []);

	const roles = data?.list || [];
	const total = data?.total || 0;

	const columns = useMemo<ColumnDef<Role>[]>(
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
				accessorKey: "name",
				header: t("role.name"),
			},
			{
				accessorKey: "code",
				header: t("role.code"),
			},
			{
				accessorKey: "data_scope",
				header: t("dataScope.title"),
				cell: ({ row }) => {
					const isSuper = row.original.ID === 1 || row.original.code === "admin";
					const meta = getDataScopeMeta(isSuper ? 1 : row.original.data_scope);
					return (
						<Badge variant="outline" className={meta.badgeClassName}>
							{t(meta.labelKey)}
						</Badge>
					);
				},
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				cell: ({ row }) => (
					<span
						className={
							row.original.status === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
						}
					>
						{row.original.status === 0 ? t("common.normal") : t("common.stopped")}
					</span>
				),
			},
			{
				accessorKey: "sort",
				header: t("common.sort"),
				size: 80,
			},
			{
				accessorKey: "CreatedAt",
				header: t("common.createdAt"),
				cell: ({ row }) => new Date(row.original.CreatedAt).toLocaleString(locale),
			},
			{
				id: "actions",
				header: t("common.actions"),
				size: 190,
				meta: { fixed: "right" },
				cell: ({ row }) => {
					const isSuper = row.original.ID === 1 || row.original.code === "admin";
					return (
						<div className="flex justify-end space-x-2">
							<Auth permission="system:role:assign">
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleAssignMenu(row.original.ID)}
									title={t("role.assignMenu")}
								>
									<MenuIcon className="h-4 w-4" />
								</Button>
							</Auth>
							<Auth permission="system:role:datascope">
								<Button
									variant="outline"
									size="icon"
									disabled={isSuper}
									onClick={() => handleAssignDataScope(row.original)}
									title={isSuper ? t("role.superAdminScopeLocked") : t("role.assignDataScope")}
								>
									<Database className="h-4 w-4" />
								</Button>
							</Auth>
							<Auth permission="system:role:update">
								<Button variant="outline" size="icon" onClick={() => handleEdit(row.original)} title={t("common.edit")}>
									<Edit className="h-4 w-4" />
								</Button>
							</Auth>
							<Auth permission="system:role:delete">
								<Button
									variant="destructive"
									size="icon"
									disabled={isSuper}
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
		[handleEdit, handleDelete, handleAssignMenu, handleAssignDataScope, t, locale],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
			<Card className="flex-1 flex flex-col rounded-md shadow-sm border p-4 min-h-0">
				<div className="flex items-center justify-between mb-4 shrink-0">
					<Input
						placeholder={t("role.searchPlaceholder")}
						className="w-[300px]"
						value={searchKeyword}
						onChange={(e) => {
							setSearchKeyword(e.target.value);
							setPage(1);
						}}
					/>
					<Auth permission="system:role:create">
						<Button onClick={handleAdd}>
							<Plus className="mr-2 h-4 w-4" />
							{t("role.addRole")}
						</Button>
					</Auth>
				</div>

				<ZevTable
					columns={columns}
					data={roles}
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

			<RoleFormDialog
				open={isRoleDialogOpen}
				onOpenChange={setIsRoleDialogOpen}
				editingRole={editingRole}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["roles"] })}
			/>

			<AssignMenuDialog
				open={isMenuDialogOpen}
				onOpenChange={setIsMenuDialogOpen}
				roleId={assigningRoleId}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["roleMenus"] })}
			/>

			<AssignDataScopeDialog
				open={isDataScopeDialogOpen}
				onOpenChange={setIsDataScopeDialogOpen}
				role={dataScopeRole}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["roles"] });
					if (dataScopeRole) {
						queryClient.invalidateQueries({ queryKey: ["roleDataScope", dataScopeRole.ID] });
					}
				}}
			/>

			<ConfirmDialog />
		</div>
	);
}
