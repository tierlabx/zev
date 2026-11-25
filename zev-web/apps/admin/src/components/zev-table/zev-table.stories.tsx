import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Edit, Trash2 } from "lucide-react";
import { ZevTable } from "./index";

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
			<Card className="h-[460px] flex flex-col p-4">
				<Story />
			</Card>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ZevTable<SampleUser, unknown>>;

export const Default: Story = {
	args: {
		columns,
		data: sampleUsers,
		isLoading: false,
		pagination: true,
		page: 1,
		pageSize: 10,
		total: 4,
		className: "flex-1 min-h-0",
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
