import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarList } from "@zev/ui/components/bar-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zev/ui/components/card";
import { DeltaBadge } from "@zev/ui/components/delta-badge";
import { Tracker, type TrackerItem } from "@zev/ui/components/tracker";

const sampleHeartbeats: TrackerItem[] = [
	{ key: "00", status: "idle", tooltip: "00:00 · 暂无请求" },
	{ key: "01", status: "idle", tooltip: "01:00 · 暂无请求" },
	{ key: "02", status: "operational", tooltip: "02:00 · 14 次操作 · 0 次异常" },
	{ key: "03", status: "operational", tooltip: "03:00 · 22 次操作 · 0 次异常" },
	{ key: "04", status: "operational", tooltip: "04:00 · 19 次操作 · 0 次异常" },
	{ key: "05", status: "degraded", tooltip: "05:00 · 31 次操作 · 2 次异常" },
	{ key: "06", status: "operational", tooltip: "06:00 · 45 次操作 · 0 次异常" },
	{ key: "07", status: "operational", tooltip: "07:00 · 88 次操作 · 0 次异常" },
	{ key: "08", status: "down", tooltip: "08:00 · 10 次操作 · 4 次异常" },
	{ key: "09", status: "operational", tooltip: "09:00 · 132 次操作 · 0 次异常" },
	{ key: "10", status: "operational", tooltip: "10:00 · 164 次操作 · 1 次异常" },
	{ key: "11", status: "operational", tooltip: "11:00 · 121 次操作 · 0 次异常" },
];

const meta: Meta = {
	title: "Data/TelemetryPrimitives",
};

export default meta;
type Story = StoryObj;

export const HealthAndDistribution: Story = {
	render: () => (
		<div className="grid max-w-3xl gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">服务心跳状态条</CardTitle>
					<CardDescription>悬停查看各时段请求与异常详情</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Tracker data={sampleHeartbeats} />
					<div className="flex flex-wrap items-center gap-2">
						<DeltaBadge value={18.4} label="较前 7 天" />
						<DeltaBadge value={-6.2} label="异常率" />
						<DeltaBadge value={0} label="持平" />
						<DeltaBadge value={null} label="无基数" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">活跃模块分布</CardTitle>
					<CardDescription>按操作审计频次排序</CardDescription>
				</CardHeader>
				<CardContent>
					<BarList
						data={[
							{ name: "用户管理", value: 342 },
							{ name: "角色权限", value: 198 },
							{ name: "通知公告", value: 126 },
							{ name: "字典管理", value: 64 },
						]}
						valueFormatter={(v) => `${v} 次`}
					/>
				</CardContent>
			</Card>
		</div>
	),
};
