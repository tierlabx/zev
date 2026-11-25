import { Effect, Effects } from "@animate-ui/react/primitives/effects/effect";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@zev/ui/components/card";
import { type DashboardActivityRes, getDashboardStats } from "@/api/system/dashboard";
import { useI18n } from "@/i18n";
import { ActivityTrendChart } from "./dashboard/ActivityTrendChart";
import { KpiCardGrid } from "./dashboard/KpiCardGrid";
import { ModuleDistributionCard } from "./dashboard/ModuleDistributionCard";
import { SystemHealthCard } from "./dashboard/SystemHealthCard";

export default function Dashboard() {
	const { t } = useI18n();
	const { data: res, isLoading } = useQuery({
		queryKey: ["dashboardStats"],
		queryFn: getDashboardStats,
	});

	const stats = res?.stats;
	const trends = res?.trends || [];
	const heartbeats = res?.heartbeats || [];
	const modules = res?.modules || [];
	const activities = res?.activities || [];
	const health = res?.health;

	return (
		<div className="space-y-6 pb-6 shrink-0">
			{/* 区块 1：核心 KPI 指标卡 */}
			<KpiCardGrid stats={stats} trends={trends} isLoading={isLoading} />

			{/* 区块 2 & 3：左侧趋势图 + 活跃模块分布，右侧系统健康心跳 + 最新操作动态 */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<div className="lg:col-span-4 space-y-4 flex flex-col">
					<ActivityTrendChart trends={trends} isLoading={isLoading} />
					<ModuleDistributionCard modules={modules} isLoading={isLoading} />
				</div>

				<div className="lg:col-span-3 space-y-4 flex flex-col">
					<SystemHealthCard health={health} heartbeats={heartbeats} isLoading={isLoading} />

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
															<span className="text-xs text-muted-foreground tabular-nums">{act.createdAt}</span>
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
