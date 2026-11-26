import { Button } from "@zev/ui/components/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Switch } from "@zev/ui/components/switch";
import type { Control } from "react-hook-form";
import type { AgentToolMeta } from "@/api/agent";
import { useI18n } from "@/i18n";
import type { AgentFormValues } from "./agent-form-schema";

interface AgentGuardrailTabProps {
	control: Control<AgentFormValues>;
	tools: AgentToolMeta[];
	approvalTools: string[];
	onToggleApprovalTool: (name: string) => void;
}

export function AgentGuardrailTab({ control, tools, approvalTools, onToggleApprovalTool }: AgentGuardrailTabProps) {
	const { t } = useI18n();

	return (
		<div className="space-y-3">
			<FormField
				control={control}
				name="enable_pii_filter"
				render={({ field }) => (
					<FormItem className="flex items-center justify-between rounded-md border px-3 py-2.5">
						<div className="space-y-0.5">
							<FormLabel>{t("agent.workspace.enablePiiFilter")}</FormLabel>
							<p className="text-xs text-muted-foreground">{t("agent.workspace.enablePiiFilterDesc")}</p>
						</div>
						<Switch checked={field.value} onCheckedChange={field.onChange} />
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name="require_high_risk_review"
				render={({ field }) => (
					<FormItem className="flex items-center justify-between rounded-md border px-3 py-2.5">
						<div className="space-y-0.5">
							<FormLabel>{t("agent.workspace.requireHighRiskReview")}</FormLabel>
							<p className="text-xs text-muted-foreground">{t("agent.workspace.requireHighRiskReviewDesc")}</p>
						</div>
						<Switch checked={field.value} onCheckedChange={field.onChange} />
					</FormItem>
				)}
			/>

			<div className="space-y-2 rounded-md border p-3">
				<div className="text-xs font-medium">{t("agent.workspace.requireApprovalTools")}</div>
				<div className="flex flex-wrap gap-2">
					{tools.map((tool) => {
						const active = approvalTools.includes(tool.name);
						return (
							<Button
								key={tool.name}
								type="button"
								size="sm"
								variant={active ? "default" : "outline"}
								className="h-7 text-xs font-mono"
								onClick={() => onToggleApprovalTool(tool.name)}
							>
								{tool.name}
							</Button>
						);
					})}
				</div>
			</div>

			<FormField
				control={control}
				name="blocked_keywords_text"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{t("agent.workspace.blockedKeywords")}</FormLabel>
						<FormControl>
							<Input placeholder="DROP TABLE, rm -rf, 导出密码" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid grid-cols-2 gap-3">
				<FormField
					control={control}
					name="max_input_runes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("agent.workspace.maxInputRunes")}</FormLabel>
							<FormControl>
								<Input
									type="number"
									value={field.value}
									onChange={(e) => field.onChange(Number(e.target.value) || 8000)}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={control}
					name="max_output_runes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("agent.workspace.maxOutputRunes")}</FormLabel>
							<FormControl>
								<Input
									type="number"
									value={field.value}
									onChange={(e) => field.onChange(Number(e.target.value) || 16000)}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
		</div>
	);
}
