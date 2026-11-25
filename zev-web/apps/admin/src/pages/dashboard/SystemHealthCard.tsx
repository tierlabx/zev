import { Effect } from "@animate-ui/react/primitives/effects/effect";
import { Card, CardContent, CardHeader, CardTitle } from "@zev/ui/components/card";
import { Progress } from "@zev/ui/components/progress";
import { Tracker, type TrackerItem, type TrackerStatus } from "@zev/ui/components/tracker";
import { Activity, Cpu, Database, HardDrive } from "lucide-react";
import { useMemo } from "react";
import type { DashboardHealthRes, DashboardHeartbeatRes } from "@/api/system/dashboard";
import { useI18n } from "@/i18n";

interface SystemHealthCardProps {
	health?: DashboardHealthRes;
	heartbeats: DashboardHeartbeatRes[];
	isLoading: boolean;
}

function resolveHeartbeatStatus(total: number, failed: number): TrackerStatus {
	if (total <= 0) return "idle";
	if (failed <= 0) return "operational";
	if (failed / total >= 0.2) return "down";
	return "degraded";
}

export function SystemHealthCard({ health, heartbeats, isLoading }: SystemHealthCardProps) {
	const { t } = useI18n();

	const { trackerItems, availabilityRate } = useMemo(() => {
		const items: TrackerItem[] = heartbeats.map((beat) => {
			const status = resolveHeartbeatStatus(beat.total, beat.failed);
			const tooltip =
				beat.total > 0
					? t("dashboard.heartbeatTooltip", {
							hour: beat.hour,
							total: beat.total,
							failed: beat.failed,
						})
					: `${beat.hour} · ${t("dashboard.heartbeatNoData")}`;
			return {
				key: beat.hour,
				status,
				tooltip,
			};
		});

		const totalOps = heartbeats.reduce((sum, item) => sum + item.total, 0);
		const totalFailed = heartbeats.reduce((sum, item) => sum + item.failed, 0);
		const rate = totalOps > 0 ? (((totalOps - totalFailed) / totalOps) * 100).toFixed(1) : "100.0";

		return { trackerItems: items, availabilityRate: rate };
	}, [heartbeats, t]);

	const firstHour = heartbeats[0]?.hour;
	const lastHour = heartbeats[heartbeats.length - 1]?.hour;

	return (
		<Effect fade slide={{ direction: "left", offset: 12 }} delay={240}>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-md flex items-center gap-2">
						<Activity className="h-4 w-4" />
						{t("dashboard.healthTitle")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* 24 小时服务心跳 Tracker */}
					<div className="space-y-1.5 pb-1">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">{t("dashboard.heartbeatTitle")}</span>
							<span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
								{t("dashboard.heartbeatAvailability", { rate: availabilityRate })}
							</span>
						</div>
						{isLoading ? (
							<div className="h-7 w-full rounded bg-muted animate-pulse" />
						) : trackerItems.length > 0 ? (
							<>
								<Tracker data={trackerItems} />
								{firstHour && lastHour ? (
									<div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
										<span>{firstHour}</span>
										<span>{lastHour}</span>
									</div>
								) : null}
							</>
						) : null}
					</div>

					<div className="space-y-1">
						<div className="flex justify-between text-xs">
							<span className="flex items-center gap-1 text-muted-foreground">
								<Cpu className="h-3 w-3" /> {t("dashboard.cpuUsage")}
							</span>
							<span className="font-medium tabular-nums">{health?.cpuUsage ?? 0}%</span>
						</div>
						<Progress value={health?.cpuUsage || 0} className="h-2" />
					</div>
					<div className="space-y-1">
						<div className="flex justify-between text-xs">
							<span className="flex items-center gap-1 text-muted-foreground">
								<HardDrive className="h-3 w-3" /> {t("dashboard.memoryUsage")}
							</span>
							<span className="font-medium tabular-nums">{health?.memoryUsage ?? 0}%</span>
						</div>
						<Progress value={health?.memoryUsage || 0} className="h-2" />
					</div>
					<div className="space-y-1">
						<div className="flex justify-between text-xs">
							<span className="flex items-center gap-1 text-muted-foreground">
								<Database className="h-3 w-3" /> {t("dashboard.dbResponse")}
							</span>
							<span className="font-medium tabular-nums">
								{health?.dbResponse ?? 0}%
								{typeof health?.dbLatency === "number" && (health?.dbResponse ?? 0) > 0
									? ` · ${t("dashboard.dbLatencyUnit", { ms: health.dbLatency })}`
									: ""}
							</span>
						</div>
						<Progress value={health?.dbResponse || 0} className="h-2" />
					</div>
				</CardContent>
			</Card>
		</Effect>
	);
}
