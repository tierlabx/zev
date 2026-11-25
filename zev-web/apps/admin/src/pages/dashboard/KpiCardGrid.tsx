import { AnimateIcon } from "@animate-ui/react/icons";
import { Effects } from "@animate-ui/react/primitives/effects/effect";
import { CountingNumber } from "@animate-ui/react/primitives/texts/counting-number";
import { BookOpen } from "@zev/ui/components/animate-ui/icons/book-open";
import { Layers } from "@zev/ui/components/animate-ui/icons/layers";
import { ShieldCheck } from "@zev/ui/components/animate-ui/icons/shield-check";
import { Users } from "@zev/ui/components/animate-ui/icons/users";
import { Card, CardContent, CardHeader, CardTitle } from "@zev/ui/components/card";
import { DeltaBadge } from "@zev/ui/components/delta-badge";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { DashboardStatsRes, DashboardTrendRes } from "@/api/system/dashboard";
import { useI18n } from "@/i18n";

interface KpiCardGridProps {
	stats?: DashboardStatsRes;
	trends: DashboardTrendRes[];
	isLoading: boolean;
}

function getGroupSeparator(locale: string): string | undefined {
	return new Intl.NumberFormat(locale).formatToParts(1000).find((part) => part.type === "group")?.value;
}

function calcSevenDayDelta(trends: DashboardTrendRes[], getter: (t: DashboardTrendRes) => number): number | null {
	if (trends.length < 14) return null;
	const prevSum = trends.slice(0, 7).reduce((sum, item) => sum + getter(item), 0);
	const currSum = trends.slice(-7).reduce((sum, item) => sum + getter(item), 0);
	if (prevSum === 0 && currSum === 0) return 0;
	if (prevSum === 0) return null;
	return ((currSum - prevSum) / prevSum) * 100;
}

export function KpiCardGrid({ stats, trends, isLoading }: KpiCardGridProps) {
	const { locale, t } = useI18n();
	const thousandSeparator = getGroupSeparator(locale);
	const recentSeven = trends.slice(-7);
	const userDelta = calcSevenDayDelta(trends, (item) => item.count);

	const statCards = [
		{
			key: "users",
			title: t("dashboard.userTotalTitle"),
			value: stats?.userTotal || 0,
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.userTotalDesc"),
			delta: userDelta,
			sparkData: recentSeven,
		},
		{
			key: "roles",
			title: t("dashboard.roleTotalTitle"),
			value: stats?.roleTotal || 0,
			icon: <ShieldCheck className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.roleTotalDesc"),
			delta: undefined,
			sparkData: undefined,
		},
		{
			key: "menus",
			title: t("dashboard.menuTotalTitle"),
			value: stats?.menuTotal || 0,
			icon: <Layers className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.menuTotalDesc"),
			delta: undefined,
			sparkData: undefined,
		},
		{
			key: "dicts",
			title: t("dashboard.dictTotalTitle"),
			value: stats?.dictTotal || 0,
			icon: <BookOpen className="h-4 w-4 text-muted-foreground" />,
			description: t("dashboard.dictTotalDesc"),
			delta: undefined,
			sparkData: undefined,
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Effects fade slide={{ direction: "up", offset: 12 }} delay={100} holdDelay={50}>
				{statCards.map((card) => (
					<AnimateIcon key={card.key} animateOnHover asChild>
						<Card className="hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow] duration-200 flex flex-col justify-between">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">{card.title}</CardTitle>
								{card.icon}
							</CardHeader>
							<CardContent>
								<div className="flex items-end justify-between gap-3">
									<div className="min-w-0">
										<div className="text-2xl font-bold tabular-nums">
											{isLoading ? (
												<span className="bg-muted animate-pulse rounded w-16 inline-block h-8" />
											) : (
												<CountingNumber number={card.value} thousandSeparator={thousandSeparator} />
											)}
										</div>
										{card.delta !== undefined ? (
											<div className="mt-1.5 flex items-center gap-1.5">
												<DeltaBadge value={card.delta} label={t("dashboard.vsPrev7Days")} />
											</div>
										) : (
											<p className="text-xs text-muted-foreground mt-1.5 truncate">{card.description}</p>
										)}
									</div>

									{card.sparkData && card.sparkData.length > 0 && !isLoading ? (
										<div className="h-10 w-24 shrink-0">
											<ResponsiveContainer width="100%" height="100%">
												<AreaChart data={card.sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
													<defs>
														<linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
															<stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
															<stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
														</linearGradient>
													</defs>
													<Area
														type="monotone"
														dataKey="count"
														stroke="var(--color-primary)"
														strokeWidth={1.75}
														fill="url(#kpiSparkFill)"
														isAnimationActive={false}
													/>
												</AreaChart>
											</ResponsiveContainer>
										</div>
									) : null}
								</div>
							</CardContent>
						</Card>
					</AnimateIcon>
				))}
			</Effects>
		</div>
	);
}
