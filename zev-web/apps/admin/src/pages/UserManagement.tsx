import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Label } from "@zev/ui/components/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@zev/ui/components/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zev/ui/components/table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createUser, deleteUser, getUserList, type User, updateUser } from "@/api/system/user";

export default function UserManagement() {
	const queryClient = useQueryClient();
	const [page] = useState(1);
	const [pageSize] = useState(10);
	const [search, setSearch] = useState("");

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);

	// Form state
	const [formData, setFormData] = useState({
		username: "",
		password: "",
		nickname: "",
		role_id: 1,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["users", page, pageSize, search],
		queryFn: () => getUserList({ page, pageSize }),
	});

	const createMutation = useMutation({
		mutationFn: createUser,
		onSuccess: () => {
			toast.success("用户创建成功");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setIsSheetOpen(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "创建用户失败");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			toast.success("用户更新成功");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setIsSheetOpen(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "更新用户失败");
		},
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
		setFormData({ username: "", password: "", nickname: "", role_id: 1 });
		setIsSheetOpen(true);
	};

	const handleEdit = (user: User) => {
		setEditingUser(user);
		setFormData({
			username: user.username,
			password: "", // Don't fill password on edit
			nickname: user.nickname,
			role_id: user.role_id,
		});
		setIsSheetOpen(true);
	};

	const handleDelete = (id: number) => {
		if (window.confirm("确定要删除此用户吗？")) {
			deleteMutation.mutate(id);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingUser) {
			updateMutation.mutate({
				ID: editingUser.ID,
				username: formData.username,
				nickname: formData.nickname,
				role_id: Number(formData.role_id),
				...(formData.password ? { password: formData.password } : {}),
			} as Partial<User>);
		} else {
			createMutation.mutate({
				...formData,
				role_id: Number(formData.role_id),
			} as Partial<User>);
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

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>{editingUser ? "编辑用户" : "添加用户"}</SheetTitle>
						<SheetDescription>{editingUser ? "更新用户的详细信息。" : "填写详细信息以创建新用户。"}</SheetDescription>
					</SheetHeader>

					<form onSubmit={handleSubmit} className="space-y-4 mt-6">
						<div className="space-y-2">
							<Label htmlFor="username">用户名</Label>
							<Input
								id="username"
								value={formData.username}
								onChange={(e) => setFormData({ ...formData, username: e.target.value })}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">
								密码 {editingUser && <span className="text-muted-foreground text-xs">(留空则不修改)</span>}
							</Label>
							<Input
								id="password"
								type="password"
								value={formData.password}
								onChange={(e) => setFormData({ ...formData, password: e.target.value })}
								required={!editingUser}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="nickname">昵称</Label>
							<Input
								id="nickname"
								value={formData.nickname}
								onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="role_id">角色 ID</Label>
							<Input
								id="role_id"
								type="number"
								value={formData.role_id}
								onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
								required
							/>
						</div>

						<div className="pt-4 flex justify-end">
							<Button type="button" variant="outline" className="mr-2" onClick={() => setIsSheetOpen(false)}>
								取消
							</Button>
							<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
								{createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
							</Button>
						</div>
					</form>
				</SheetContent>
			</Sheet>
		</div>
	);
}
