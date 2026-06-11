import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { getRoleList } from "@/api/system/role";
import { deleteUser, getUserList, type User } from "@/api/system/user";
import { ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { UserFormDialog } from "./components/UserFormDialog";

export default function UserManagement() {
	const queryClient = useQueryClient();
	const [page] = useState(1);
	const [pageSize] = useState(10);

	const { confirm, ConfirmDialog } = useConfirm();
	const [search, setSearch] = useState("");

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["users", page, pageSize, search],
		queryFn: () => getUserList({ page, pageSize }),
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

	const handleDelete = useCallback(
		(id: number) => {
			confirm("确定要删除此用户吗？", () => {
				deleteMutation.mutate(id);
			});
		},
		[deleteMutation, confirm],
	);

	const users = data?.list || [];

	const columns = useMemo<ColumnDef<User>[]>(
		() => [
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
				accessorKey: "role_id",
				header: "角色",
				cell: ({ row }) => {
					const role = roles.find((r) => r.ID === row.original.role_id);
					return role ? role.name : `#${row.original.role_id}`;
				},
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
						<Button variant="outline" size="icon" onClick={() => handleEdit(row.original)}>
							<Edit className="h-4 w-4" />
						</Button>
						<Button variant="destructive" size="icon" onClick={() => handleDelete(row.original.ID)}>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[handleEdit, handleDelete, roles],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-end">
				<Button onClick={handleAdd}>
					<Plus className="mr-2 h-4 w-4" />
					添加用户
				</Button>
			</div>

			<Card className="rounded-md shadow-sm border p-4">
				<div className="flex items-center justify-between mb-4">
					<Input
						placeholder="搜索用户..."
						className="w-[300px]"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				<ZevTable columns={columns} data={users} isLoading={isLoading} containerHeight="calc(100vh - 280px)" />
			</Card>

			<UserFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingUser={editingUser}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
			/>
			<ConfirmDialog />
		</div>
	);
}
