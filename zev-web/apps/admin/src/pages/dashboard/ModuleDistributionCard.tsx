import { Effect } from "@animate-ui/react/primitives/effects/effect";
import { BarList } from "@zev/ui/components/bar-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zev/ui/components/card";
import { useMemo } from "react";
import type { DashboardModuleRes } from "@/api/system/dashboard";
import { useI18n } from "@/i18n";

interface ModuleDistributionCardProps {
	modules: DashboardModuleRes[];
	isLoading: boolean;
}

export function ModuleDistributionCard({ modules, isLoading }: ModuleDistributionCardProps) {
	const { t } = useI18n();

	const barData = useMemo(
		() =>
			modules.map((item) => ({
				key: item.module,
				name: item.module,
				value: item.count,
			})),
		[modules],
	);

	return (
		<Effect fade slide={{ direction: "up", offset: 12 }} delay={260}>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-md">{t("dashboard.moduleDistTitle")}</CardTitle>
					<CardDescription>{t("dashboard.moduleDistDesc")}</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-2.5">
							{[1, 2, 3, 4].map((idx) => (
								<div key={idx} className="h-8 rounded bg-muted animate-pulse" />
							))}
						</div>
					) : barData.length > 0 ? (
						<BarList data={barData} valueFormatter={(count) => t("dashboard.operUnit", { count })} />
					) : (
						<div className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.noModules")}</div>
					)}
				</CardContent>
			</Card>
		</Effect>
	);
}
