import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Edit, MenuIcon, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteRole, getRoleList, type Role } from "@/api/system/role";
import { ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { AssignMenuDialog } from "./components/AssignMenuDialog";
import { RoleFormDialog } from "./components/RoleFormDialog";

export default function RoleManagement() {
	const queryClient = useQueryClient();
	const [page] = useState(1);
	const [pageSize] = useState(10);

	const { confirm, ConfirmDialog } = useConfirm();

	const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<Role | null>(null);

	const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
	const [assigningRoleId, setAssigningRoleId] = useState<number | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["roles", page, pageSize],
		queryFn: () => getRoleList({ page, pageSize }),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteRole,
		onSuccess: () => {
			toast.success("角色删除成功");
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "删除角色失败");
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
			confirm("确定要删除此角色吗？", () => {
				deleteMutation.mutate(id);
			});
		},
		[deleteMutation, confirm],
	);

	const handleAssignMenu = useCallback((id: number) => {
		setAssigningRoleId(id);
		setIsMenuDialogOpen(true);
	}, []);

	const roles = data?.list || [];

	const columns = useMemo<ColumnDef<Role>[]>(
		() => [
			{
				accessorKey: "ID",
				header: "角色 ID",
				cell: ({ row }) => `#${row.original.ID}`,
			},
			{
				accessorKey: "name",
				header: "角色名称",
			},
			{
				accessorKey: "code",
				header: "角色编码",
			},
			{
				accessorKey: "status",
				header: "状态",
				cell: ({ row }) => (
					<span className={row.original.status === 0 ? "text-green-600" : "text-red-600"}>
						{row.original.status === 0 ? "正常" : "停用"}
					</span>
				),
			},
			{
				accessorKey: "sort",
				header: "排序",
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
						<Button variant="outline" size="icon" onClick={() => handleAssignMenu(row.original.ID)} title="分配菜单">
							<MenuIcon className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="icon" onClick={() => handleEdit(row.original)} title="编辑">
							<Edit className="h-4 w-4" />
						</Button>
						<Button variant="destructive" size="icon" onClick={() => handleDelete(row.original.ID)} title="删除">
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[handleEdit, handleDelete, handleAssignMenu],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-end">
				<Button onClick={handleAdd}>
					<Plus className="mr-2 h-4 w-4" />
					添加角色
				</Button>
			</div>

			<Card className="rounded-md shadow-sm border p-4">
				<ZevTable columns={columns} data={roles} isLoading={isLoading} containerHeight="calc(100vh - 200px)" />
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
			<ConfirmDialog />
		</div>
	);
}
