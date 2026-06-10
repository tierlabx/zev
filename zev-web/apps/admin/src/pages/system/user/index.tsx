import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteUser, getUserList, type User } from "@/api/system/user";
import { UserFormDialog } from "./components/UserFormDialog";

export default function UserManagement() {
	const queryClient = useQueryClient();
	const [page] = useState(1);
	const [pageSize] = useState(10);
	const [search, setSearch] = useState("");

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["users", page, pageSize, search],
		queryFn: () => getUserList({ page, pageSize }),
	});

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

	const handleAdd = () => {
		setEditingUser(null);
		setIsDialogOpen(true);
	};

	const handleEdit = (user: User) => {
		setEditingUser(user);
		setIsDialogOpen(true);
	};

	const handleDelete = (id: number) => {
		if (window.confirm("确定要删除此用户吗？")) {
			deleteMutation.mutate(id);
		}
	};

	const users = data?.list || [];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">用户管理</h1>
				<Button onClick={handleAdd}>
					<Plus className="mr-2 h-4 w-4" />
					添加用户
				</Button>
			</div>

			<Card className="rounded-md shadow-sm border">
				<div className="flex items-center justify-between p-4 border-b">
					<Input
						placeholder="搜索用户..."
						className="w-[300px]"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>用户 ID</TableHead>
							<TableHead>用户名</TableHead>
							<TableHead>昵称</TableHead>
							<TableHead>角色 ID</TableHead>
							<TableHead>创建时间</TableHead>
							<TableHead className="text-right">操作</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center h-24">
									加载中...
								</TableCell>
							</TableRow>
						) : users.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
									未找到用户。
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.ID}>
									<TableCell>#{user.ID}</TableCell>
									<TableCell>{user.username}</TableCell>
									<TableCell>{user.nickname}</TableCell>
									<TableCell>{user.role_id}</TableCell>
									<TableCell>{new Date(user.CreatedAt).toLocaleString()}</TableCell>
									<TableCell className="text-right space-x-2">
										<Button variant="outline" size="icon" onClick={() => handleEdit(user)}>
											<Edit className="h-4 w-4" />
										</Button>
										<Button variant="destructive" size="icon" onClick={() => handleDelete(user.ID)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Card>

			<UserFormDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				editingUser={editingUser}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
			/>
		</div>
	);
}
