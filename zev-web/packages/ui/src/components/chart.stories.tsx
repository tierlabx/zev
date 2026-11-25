import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zev/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@zev/ui/components/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartData = [
	{ date: "11-18", operations: 148, failures: 2 },
	{ date: "11-19", operations: 210, failures: 5 },
	{ date: "11-20", operations: 184, failures: 1 },
	{ date: "11-21", operations: 265, failures: 3 },
	{ date: "11-22", operations: 230, failures: 0 },
	{ date: "11-23", operations: 294, failures: 4 },
	{ date: "11-24", operations: 318, failures: 2 },
];

const chartConfig: ChartConfig = {
	operations: {
		label: "操作审计",
		color: "var(--color-primary)",
	},
	failures: {
		label: "异常操作",
		color: "var(--color-destructive)",
	},
};

const meta: Meta = {
	title: "Data/Chart",
};

export default meta;
type Story = StoryObj;

export const OperationsAreaChart: Story = {
	render: () => (
		<Card className="max-w-2xl">
			<CardHeader>
				<CardTitle>系统操作趋势</CardTitle>
				<CardDescription>近 7 天操作量与异常分布</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[260px] w-full aspect-auto">
					<AreaChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} />
						<XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={8} />
						<YAxis axisLine={false} tickLine={false} />
						<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
						<Area
							type="monotone"
							dataKey="operations"
							stroke="var(--color-operations)"
							fill="var(--color-operations)"
							fillOpacity={0.18}
							strokeWidth={2}
						/>
						<Area
							type="monotone"
							dataKey="failures"
							stroke="var(--color-failures)"
							fill="var(--color-failures)"
							fillOpacity={0.15}
							strokeWidth={1.75}
						/>
						<ChartLegend content={<ChartLegendContent />} />
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	),
};
