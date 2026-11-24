import { Effect, Effects } from "@animate-ui/react/primitives/effects/effect";
import { CountingNumber } from "@animate-ui/react/primitives/texts/counting-number";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zev/ui/components/card";
import { Progress } from "@zev/ui/components/progress";
import { Activity, Cpu, Database, HardDrive, ShieldCheck, UserCheck, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type DashboardActivityRes, getDashboardStats } from "@/api/system/dashboard";
import { useI18n } from "@/i18n";

function getGroupSeparator(locale: string): string | undefined {
	return new Intl.NumberFormat(locale).formatToParts(1000).find((part) => part.type === "group")?.value;
}

export default function Dashboard() {
	const { locale, t } = useI18n();
	const { data: res, isLoading } = useQuery({
		queryKey: ["dashboardStats"],
		queryFn: getDashboardStats,
	});

	const stats = res?.stats;
	const trends = res?.trends || [];
	const activities = res?.activities || [];
	const health = res?.health;
	const thousandSeparator = getGroupSeparator(locale);

	const statCards = [
		{
			title: t("dashboard.userTotalTitle"),
			value: stats?.userTotal || 0,
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.userTotalDesc"),
		},
		{
			title: t("dashboard.roleTotalTitle"),
			value: stats?.roleTotal || 0,
			icon: <ShieldCheck className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.roleTotalDesc"),
		},
		{
			title: t("dashboard.menuTotalTitle"),
			value: stats?.menuTotal || 0,
			icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.menuTotalDesc"),
		},
		{
			title: t("dashboard.dictTotalTitle"),
			value: stats?.dictTotal || 0,
			icon: <Database className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.dictTotalDesc"),
		},
	];

	return (
		<div className="space-y-6 overflow-hidden pb-4">
			{/* 区块 1：统计卡片 */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Effects fade slide={{ direction: "up", offset: 12 }} delay={100} holdDelay={50}>
					{statCards.map((card) => (
						<Card
							key={card.title}
							className="hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow] duration-200"
						>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">{card.title}</CardTitle>
								{card.icon}
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{isLoading ? (
										<span className="bg-muted animate-pulse rounded w-16 inline-block h-8"></span>
									) : (
										<CountingNumber number={card.value} thousandSeparator={thousandSeparator} />
									)}
								</div>
								<p className="text-xs text-muted-foreground mt-1">{card.description}</p>
							</CardContent>
						</Card>
					))}
				</Effects>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				{/* 区块 2：趋势图 */}
				<Effect fade slide={{ direction: "up", offset: 12 }} delay={200} className="col-span-4 flex flex-col">
					<Card className="flex-1">
						<CardHeader>
							<CardTitle>{t("dashboard.trendTitle")}</CardTitle>
							<CardDescription>{t("dashboard.trendDesc")}</CardDescription>
						</CardHeader>
						<CardContent className="min-h-[300px]">
							{isLoading ? (
								<div className="w-full h-full bg-muted animate-pulse rounded-md min-h-[300px]" />
							) : (
								<ResponsiveContainer width="100%" height={300}>
									<AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
										<defs>
											<linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="var(--color-primary, #2563EB)" stopOpacity={0.3} />
												<stop offset="95%" stopColor="var(--color-primary, #2563EB)" stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
										<XAxis
											dataKey="date"
											axisLine={false}
											tickLine={false}
											tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
											dy={10}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
										/>
										<Tooltip
											contentStyle={{
												borderRadius: "8px",
												border: "1px solid var(--color-border)",
												backgroundColor: "var(--color-popover)",
											}}
											labelStyle={{ color: "var(--color-muted-foreground)" }}
											itemStyle={{ color: "var(--color-foreground)" }}
										/>
										<Area
											type="monotone"
											dataKey="count"
											name={t("dashboard.trendSeriesName")}
											stroke="var(--color-primary, #2563EB)"
											fillOpacity={1}
											fill="url(#colorCount)"
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							)}
						</CardContent>
					</Card>
				</Effect>

				<div className="col-span-3 space-y-4 flex flex-col">
					{/* 区块 3：系统健康 */}
					<Effect fade slide={{ direction: "left", offset: 12 }} delay={250}>
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-md flex items-center gap-2">
									<Activity className="h-4 w-4" />
									{t("dashboard.healthTitle")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-1">
									<div className="flex justify-between text-xs">
										<span className="flex items-center gap-1 text-muted-foreground">
											<Cpu className="h-3 w-3" /> {t("dashboard.cpuUsage")}
										</span>
										<span className="font-medium">{health?.cpuUsage ?? 0}%</span>
									</div>
									<Progress value={health?.cpuUsage || 0} className="h-2" />
								</div>
								<div className="space-y-1">
									<div className="flex justify-between text-xs">
										<span className="flex items-center gap-1 text-muted-foreground">
											<HardDrive className="h-3 w-3" /> {t("dashboard.memoryUsage")}
										</span>
										<span className="font-medium">{health?.memoryUsage ?? 0}%</span>
									</div>
									<Progress value={health?.memoryUsage || 0} className="h-2" />
								</div>
								<div className="space-y-1">
									<div className="flex justify-between text-xs">
										<span className="flex items-center gap-1 text-muted-foreground">
											<Database className="h-3 w-3" /> {t("dashboard.dbResponse")}
										</span>
										<span className="font-medium">{health?.dbResponse ?? 0}%</span>
									</div>
									<Progress value={health?.dbResponse || 0} className="h-2" />
								</div>
							</CardContent>
						</Card>
					</Effect>

					{/* 区块 4：最新动态 */}
					<Effect fade slide={{ direction: "left", offset: 12 }} delay={300} className="flex-1 flex flex-col">
						<Card className="flex-1">
							<CardHeader className="pb-3">
								<CardTitle className="text-md">{t("dashboard.activityTitle")}</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="space-y-3">
										{[1, 2, 3].map((i) => (
											<div key={i} className="h-8 bg-muted animate-pulse rounded" />
										))}
									</div>
								) : activities.length > 0 ? (
									<div className="space-y-4">
										<Effects fade slide={{ direction: "left", offset: 10 }} delay={340} holdDelay={40}>
											{activities.map((act: DashboardActivityRes) => (
												<div key={act.id} className="flex items-start gap-3">
													<div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
													<div className="flex flex-col gap-1 w-full">
														<div className="flex justify-between text-sm">
															<span className="font-medium">{act.operator}</span>
															<span className="text-xs text-muted-foreground">{act.createdAt}</span>
														</div>
														<span className="text-xs text-muted-foreground">{act.action}</span>
													</div>
												</div>
											))}
										</Effects>
									</div>
								) : (
									<div className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noActivities")}</div>
								)}
							</CardContent>
						</Card>
					</Effect>
				</div>
			</div>
		</div>
	);
}
