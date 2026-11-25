import { Effect } from "@animate-ui/react/primitives/effects/effect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zev/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@zev/ui/components/chart";
import { cn } from "@zev/ui/lib/utils";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { DashboardTrendRes } from "@/api/system/dashboard";
import { useI18n } from "@/i18n";

type MetricMode = "users" | "logins" | "operations";
type RangeDays = 7 | 14;

interface ActivityTrendChartProps {
	trends: DashboardTrendRes[];
	isLoading: boolean;
}

export function ActivityTrendChart({ trends, isLoading }: ActivityTrendChartProps) {
	const { t } = useI18n();
	const [metric, setMetric] = useState<MetricMode>("operations");
	const [rangeDays, setRangeDays] = useState<RangeDays>(7);

	const visibleData = useMemo(() => {
		if (trends.length <= rangeDays) return trends;
		return trends.slice(-rangeDays);
	}, [trends, rangeDays]);

	const chartConfig = useMemo<ChartConfig>(
		() => ({
			count: {
				label: t("dashboard.trendMetricUsers"),
				color: "var(--color-primary)",
			},
			logins: {
				label: t("dashboard.trendMetricLogins"),
				color: "var(--color-primary)",
			},
			operations: {
				label: t("dashboard.trendMetricOpers"),
				color: "var(--color-primary)",
			},
			failures: {
				label: t("log.failed"),
				color: "var(--color-destructive)",
			},
		}),
		[t],
	);

	const metricTabs: { value: MetricMode; label: string }[] = [
		{ value: "operations", label: t("dashboard.trendMetricOpers") },
		{ value: "logins", label: t("dashboard.trendMetricLogins") },
		{ value: "users", label: t("dashboard.trendMetricUsers") },
	];

	const primaryKey = metric === "users" ? "count" : metric === "logins" ? "logins" : "operations";

	return (
		<Effect fade slide={{ direction: "up", offset: 12 }} delay={200}>
			<Card>
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle>
							{metric === "users"
								? t("dashboard.trendTitle")
								: metric === "logins"
									? t("dashboard.trendMetricLogins")
									: t("dashboard.trendMetricOpers")}
						</CardTitle>
						<CardDescription>{t("dashboard.trendSubtitle", { days: rangeDays })}</CardDescription>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5">
							{metricTabs.map((tab) => (
								<button
									key={tab.value}
									type="button"
									onClick={() => setMetric(tab.value)}
									className={cn(
										"px-2.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer",
										metric === tab.value
											? "bg-background text-foreground shadow-xs"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{tab.label}
								</button>
							))}
						</div>

						<div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5">
							{([7, 14] as const).map((days) => (
								<button
									key={days}
									type="button"
									onClick={() => setRangeDays(days)}
									className={cn(
										"px-2 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer tabular-nums",
										rangeDays === days
											? "bg-background text-foreground shadow-xs"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{days === 7 ? t("dashboard.trendRange7") : t("dashboard.trendRange14")}
								</button>
							))}
						</div>
					</div>
				</CardHeader>

				<CardContent>
					{isLoading ? (
						<div className="w-full h-[280px] bg-muted animate-pulse rounded-md" />
					) : (
						<ChartContainer config={chartConfig} className="h-[280px] w-full aspect-auto">
							<AreaChart data={visibleData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
								<defs>
									<linearGradient id="fillPrimaryTrend" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor={`var(--color-${primaryKey})`} stopOpacity={0.28} />
										<stop offset="95%" stopColor={`var(--color-${primaryKey})`} stopOpacity={0.02} />
									</linearGradient>
									<linearGradient id="fillFailureTrend" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="var(--color-failures)" stopOpacity={0.22} />
										<stop offset="95%" stopColor="var(--color-failures)" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} />
								<XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={10} />
								<YAxis axisLine={false} tickLine={false} allowDecimals={false} />
								<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
								<Area
									type="monotone"
									dataKey={primaryKey}
									stroke={`var(--color-${primaryKey})`}
									fill="url(#fillPrimaryTrend)"
									strokeWidth={2}
								/>
								{metric === "operations" ? (
									<Area
										type="monotone"
										dataKey="failures"
										stroke="var(--color-failures)"
										fill="url(#fillFailureTrend)"
										strokeWidth={1.75}
									/>
								) : null}
								{metric === "operations" ? <ChartLegend content={<ChartLegendContent />} /> : null}
							</AreaChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>
		</Effect>
	);
}
