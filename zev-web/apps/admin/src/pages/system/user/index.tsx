import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Edit, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { getRoleList } from "@/api/system/role";
import { deleteUser, getUserList, type User } from "@/api/system/user";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { AssignUserRoleDialog } from "./components/AssignUserRoleDialog";
import { UserFormDialog } from "./components/UserFormDialog";

export default function UserManagement() {
	const { locale, t } = useI18n();
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const { confirm, ConfirmDialog } = useConfirm();
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 300);

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);

	const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
	const [assigningUser, setAssigningUser] = useState<User | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["users", page, pageSize, debouncedSearch],
		queryFn: () => getUserList({ page, pageSize, keyword: debouncedSearch }),
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

	const users = data?.list || [];
	const total = data?.total || 0;

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
				accessorKey: "email",
				header: t("user.email"),
				cell: ({ row }) => row.original.email || "-",
			},
			{
				accessorKey: "role_id",
				header: t("user.role"),
				cell: ({ row }) => {
					const role = roles.find((r) => r.ID === row.original.role_id);
					return role ? role.name : `#${row.original.role_id}`;
				},
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
				size: 100,
				meta: { fixed: "right" },
				cell: ({ row }) => (
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
		[handleEdit, handleDelete, roles, handleAssignRole, t, locale],
	);

	return (
		<div className="flex-1 flex flex-col space-y-4 min-h-0">
			<Card className="flex-1 flex flex-col rounded-md shadow-sm border p-4 min-h-0">
				<div className="flex items-center justify-between mb-4 shrink-0">
					<Input
						placeholder={t("user.searchPlaceholder")}
						className="w-[300px]"
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
					onSelectionChange={(selected) => console.log("Selected users:", selected)}
				/>
			</Card>

			<UserFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingUser={editingUser}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
			/>
			<AssignUserRoleDialog
				open={isAssignRoleDialogOpen}
				onOpenChange={setIsAssignRoleDialogOpen}
				userId={assigningUser?.ID || null}
				currentRoleId={assigningUser?.role_id}
				roles={roles}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
			/>
			<ConfirmDialog />
		</div>
	);
}
