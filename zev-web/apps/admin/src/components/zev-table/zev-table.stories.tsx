import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Edit, Plus, Shield, Trash2, UserCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TableFacetedFilter, ZevTable } from "./index";

interface SampleUser {
	id: number;
	username: string;
	nickname: string;
	dept: string;
	role: string;
	status: number;
	createdAt: string;
}

const sampleUsers: SampleUser[] = [
	{
		id: 1,
		username: "admin",
		nickname: "系统管理员",
		dept: "研发中心",
		role: "超级管理员",
		status: 0,
		createdAt: "2026-10-01 09:00:00",
	},
	{
		id: 2,
		username: "ops_lin",
		nickname: "林运维",
		dept: "基础设施组",
		role: "运维审计",
		status: 0,
		createdAt: "2026-10-12 14:22:10",
	},
	{
		id: 3,
		username: "dev_chen",
		nickname: "陈研发",
		dept: "平台架构组",
		role: "普通用户",
		status: 1,
		createdAt: "2026-11-03 11:05:43",
	},
	{
		id: 4,
		username: "qa_zhao",
		nickname: "赵测试",
		dept: "质量保障部",
		role: "测试人员",
		status: 0,
		createdAt: "2026-11-18 16:40:00",
	},
];

const columns: ColumnDef<SampleUser>[] = [
	{
		accessorKey: "username",
		header: "用户名",
		size: 140,
	},
	{
		accessorKey: "nickname",
		header: "昵称",
		size: 140,
	},
	{
		accessorKey: "dept",
		header: "所属部门",
		size: 160,
	},
	{
		accessorKey: "role",
		header: "角色",
		size: 140,
		cell: ({ row }) => (
			<Badge variant="secondary" className="font-normal">
				{row.original.role}
			</Badge>
		),
	},
	{
		accessorKey: "status",
		header: "状态",
		size: 100,
		cell: ({ row }) =>
			row.original.status === 1 ? (
				<Badge variant="destructive">禁用</Badge>
			) : (
				<Badge
					variant="default"
					className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20 shadow-none"
				>
					正常
				</Badge>
			),
	},
	{
		accessorKey: "createdAt",
		header: "创建时间",
		size: 180,
	},
	{
		id: "actions",
		header: "操作",
		size: 110,
		meta: { fixed: "right" },
		cell: () => (
			<div className="flex justify-end gap-2">
				<Button variant="outline" size="icon" aria-label="编辑">
					<Edit className="h-4 w-4" />
				</Button>
				<Button variant="destructive" size="icon" aria-label="删除">
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		),
	},
];

const meta: Meta<typeof ZevTable<SampleUser, unknown>> = {
	title: "Admin/ZevTable",
	component: ZevTable,
	decorators: [
		(Story) => (
			<div className="h-[480px] flex flex-col p-4 bg-background">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ZevTable<SampleUser, unknown>>;

export const Default: Story = {
	render: () => {
		const [page, setPage] = useState(1);
		const [pageSize, setPageSize] = useState(10);
		const [keyword, setKeyword] = useState("");
		const [statusFilter, setStatusFilter] = useState<string[]>([]);
		const [roleFilter, setRoleFilter] = useState<string[]>([]);

		const filteredUsers = useMemo(
			() =>
				sampleUsers.filter((user) => {
					const matchKeyword = !keyword || user.username.includes(keyword) || user.nickname.includes(keyword);
					const matchStatus = statusFilter.length === 0 || statusFilter.includes(String(user.status));
					const matchRole = roleFilter.length === 0 || roleFilter.includes(user.role);
					return matchKeyword && matchStatus && matchRole;
				}),
			[keyword, statusFilter, roleFilter],
		);
		const hasFilters = Boolean(keyword) || statusFilter.length > 0 || roleFilter.length > 0;

		return (
			<ZevTable
				columns={columns}
				data={filteredUsers}
				isLoading={false}
				pagination={true}
				page={page}
				pageSize={pageSize}
				total={hasFilters ? filteredUsers.length : 120}
				onPageChange={setPage}
				onPageSizeChange={(next) => {
					setPageSize(next);
					setPage(1);
				}}
				toolbarLeft={
					<>
						<Input
							value={keyword}
							onChange={(e) => {
								setKeyword(e.target.value);
								setPage(1);
							}}
							placeholder="搜索用户名或昵称..."
							className="h-8 w-56"
						/>
						<TableFacetedFilter
							title="状态"
							multiple
							values={statusFilter}
							onValuesChange={(vals) => {
								setStatusFilter(vals);
								setPage(1);
							}}
							options={[
								{ label: "正常", value: "0", icon: UserCheck, count: 3 },
								{ label: "禁用", value: "1", icon: Shield, count: 1 },
							]}
						/>
						<TableFacetedFilter
							title="角色"
							multiple
							values={roleFilter}
							onValuesChange={(vals) => {
								setRoleFilter(vals);
								setPage(1);
							}}
							options={[
								{ label: "超级管理员", value: "超级管理员", count: 1 },
								{ label: "运维审计", value: "运维审计", count: 1 },
								{ label: "普通用户", value: "普通用户", count: 1 },
								{ label: "测试人员", value: "测试人员", count: 1 },
							]}
						/>
						{hasFilters ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 px-2 text-xs"
								onClick={() => {
									setKeyword("");
									setStatusFilter([]);
									setRoleFilter([]);
									setPage(1);
								}}
							>
								重置
								<X className="ml-1.5 h-3.5 w-3.5" />
							</Button>
						) : null}
					</>
				}
				toolbarRight={
					<Button size="sm" className="h-8">
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						添加用户
					</Button>
				}
				className="flex-1 min-h-0"
			/>
		);
	},
};

export const Loading: Story = {
	args: {
		columns,
		data: [],
		isLoading: true,
		pagination: true,
		page: 1,
		pageSize: 10,
		total: 0,
		className: "flex-1 min-h-0",
	},
};

export const Empty: Story = {
	args: {
		columns,
		data: [],
		isLoading: false,
		pagination: true,
		page: 1,
		pageSize: 10,
		total: 0,
		className: "flex-1 min-h-0",
	},
};
