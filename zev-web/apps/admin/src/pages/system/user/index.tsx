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
import { AssignUserRoleDialog } from "./components/AssignUserRoleDialog";
import { UserFormDialog } from "./components/UserFormDialog";

export default function UserManagement() {
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
			toast.success("用户删除成功");
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "删除用户失败");
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
			confirm("确定要删除此用户吗？", () => {
				deleteMutation.mutate(id);
			});
		},
		[deleteMutation, confirm],
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
				accessorKey: "ID",
				header: "用户 ID",
				cell: ({ row }) => `#${row.original.ID}`,
			},
			{
				accessorKey: "username",
				header: "用户名",
			},
			{
				accessorKey: "nickname",
				header: "昵称",
			},
			{
				accessorKey: "email",
				header: "邮箱",
				cell: ({ row }) => row.original.email || "-",
			},
			{
				accessorKey: "role_id",
				header: "角色",
				cell: ({ row }) => {
					const role = roles.find((r) => r.ID === row.original.role_id);
					return role ? role.name : `#${row.original.role_id}`;
				},
			},
			{
				accessorKey: "status",
				header: "状态",
				cell: ({ row }) =>
					row.original.status === 1 ? (
						<Badge variant="destructive">禁用</Badge>
					) : (
						<Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
							正常
						</Badge>
					),
			},
			{
				accessorKey: "CreatedAt",
				header: "创建时间",
				cell: ({ row }) => new Date(row.original.CreatedAt).toLocaleString(),
			},
			{
				id: "actions",
				header: () => <div className="text-right">操作</div>,
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						<Auth permission="system:user:assign">
							<Button variant="outline" size="icon" onClick={() => handleAssignRole(row.original)} title="分配角色">
								<ShieldCheck className="h-4 w-4" />
							</Button>
						</Auth>
						<Auth permission="system:user:update">
							<Button variant="outline" size="icon" onClick={() => handleEdit(row.original)} title="编辑">
								<Edit className="h-4 w-4" />
							</Button>
						</Auth>
						<Auth permission="system:user:delete">
							<Button variant="destructive" size="icon" onClick={() => handleDelete(row.original.ID)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</Auth>
					</div>
				),
			},
		],
		[handleEdit, handleDelete, roles, handleAssignRole],
	);

	return (
		<div className="space-y-6">
			<Card className="rounded-md shadow-sm border p-4">
				<div className="flex items-center justify-between mb-4">
					<Input
						placeholder="搜索用户名、昵称或邮箱..."
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
							添加用户
						</Button>
					</Auth>
				</div>

				<ZevTable
					columns={columns}
					data={users}
					isLoading={isLoading}
					containerHeight="calc(100vh - 390px)"
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
