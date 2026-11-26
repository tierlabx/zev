import { useQuery } from "@tanstack/react-query";
import { Card } from "@zev/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@zev/ui/components/tabs";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { getLogStats } from "@/api/system/log";
import { usePermission } from "@/hooks/use-permission";
import { useI18n } from "@/i18n";
import { LoginLogPanel } from "./components/LoginLogPanel";
import { OperLogPanel } from "./components/OperLogPanel";

type LogTab = "oper" | "login";

export default function LogManagement() {
	const { t } = useI18n();
	const { hasPermission, hasAllDataScope } = usePermission();

	const canViewOper = hasPermission("system:operlog:list");
	const canViewLogin = hasPermission("system:loginlog:list");
	const canClearAll = hasAllDataScope;

	const [activeTab, setActiveTab] = useState<LogTab>(() => (canViewOper ? "oper" : "login"));
	const effectiveTab: LogTab = canViewOper && (activeTab === "oper" || !canViewLogin) ? "oper" : "login";

	const { data: stats } = useQuery({
		queryKey: ["logStats"],
		queryFn: getLogStats,
	});

	return (
		<div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
			{/* 今日审计概览指标条（极简黑白灰风格） */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
				<Card className="rounded-md border px-4 py-3 shadow-none">
					<div className="text-xs text-muted-foreground">{t("log.statsOperTotal")}</div>
					<div className="mt-1 text-xl font-semibold tabular-nums">{stats?.operTotal ?? 0}</div>
				</Card>
				<Card className="rounded-md border px-4 py-3 shadow-none">
					<div className="text-xs text-muted-foreground">{t("log.statsOperToday")}</div>
					<div className="mt-1 text-xl font-semibold tabular-nums">{stats?.operToday ?? 0}</div>
				</Card>
				<Card className="rounded-md border px-4 py-3 shadow-none">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>{t("log.statsOperErrorToday")}</span>
						<AlertTriangle className="h-3.5 w-3.5 text-destructive" />
					</div>
					<div className="mt-1 text-xl font-semibold tabular-nums text-destructive">{stats?.operErrorToday ?? 0}</div>
				</Card>
				<Card className="rounded-md border px-4 py-3 shadow-none">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>{t("log.statsLoginFailToday")}</span>
						<ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
					</div>
					<div className="mt-1 text-xl font-semibold tabular-nums">
						{stats?.loginToday ?? 0}
						<span className="ml-1.5 text-xs font-normal text-destructive">/ {stats?.loginFailToday ?? 0}</span>
					</div>
				</Card>
			</div>

			<Card className="flex-1 flex flex-col rounded-md shadow-sm border p-4 min-h-[420px] min-w-0 overflow-hidden gap-3">
				<div className="flex items-center justify-between shrink-0">
					<Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as LogTab)} className="w-fit">
						<TabsList>
							{canViewOper ? <TabsTrigger value="oper">{t("log.tabOper")}</TabsTrigger> : null}
							{canViewLogin ? <TabsTrigger value="login">{t("log.tabLogin")}</TabsTrigger> : null}
						</TabsList>
					</Tabs>
				</div>

				{/* 不使用 TabsContents 高度动画容器包裹虚拟滚动表格，直接按激活 Tab 渲染以保证 flex-1 滚动边界稳定 */}
				<div role="tabpanel" className="flex-1 flex flex-col min-h-0 min-w-0">
					{effectiveTab === "oper" ? (
						<OperLogPanel canClearAll={canClearAll} />
					) : (
						<LoginLogPanel canClearAll={canClearAll} />
					)}
				</div>
			</Card>
		</div>
	);
}
