import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Edit, MenuIcon, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { deleteRole, getRoleList, type Role } from "@/api/system/role";
import { Auth } from "@/components/auth";
import { ZevTable } from "@/components/zev-table";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { AssignMenuDialog } from "./components/AssignMenuDialog";
import { RoleFormDialog } from "./components/RoleFormDialog";

export default function RoleManagement() {
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

	const { data, isLoading } = useQuery({
		queryKey: ["roles", page, pageSize, debouncedKeyword],
		queryFn: () => getRoleList({ page, pageSize, keyword: debouncedKeyword }),
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
						<Auth permission="system:role:assign">
							<Button variant="outline" size="icon" onClick={() => handleAssignMenu(row.original.ID)} title="分配菜单">
								<MenuIcon className="h-4 w-4" />
							</Button>
						</Auth>
						<Auth permission="system:role:update">
							<Button variant="outline" size="icon" onClick={() => handleEdit(row.original)} title="编辑">
								<Edit className="h-4 w-4" />
							</Button>
						</Auth>
						<Auth permission="system:role:delete">
							<Button variant="destructive" size="icon" onClick={() => handleDelete(row.original.ID)} title="删除">
								<Trash2 className="h-4 w-4" />
							</Button>
						</Auth>
					</div>
				),
			},
		],
		[handleEdit, handleDelete, handleAssignMenu],
	);

	return (
		<div className="space-y-6">
			<Card className="rounded-md shadow-sm border p-4">
				<div className="flex items-center justify-between mb-4">
					<Input
						placeholder="搜索角色名称或编码..."
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
							添加角色
						</Button>
					</Auth>
				</div>

				<ZevTable
					columns={columns}
					data={roles}
					isLoading={isLoading}
					containerHeight="calc(100vh - 390px)"
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
			<ConfirmDialog />
		</div>
	);
}
