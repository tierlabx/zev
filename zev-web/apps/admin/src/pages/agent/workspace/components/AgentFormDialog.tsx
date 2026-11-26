import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@zev/ui/components/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Switch } from "@zev/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@zev/ui/components/tabs";
import { Textarea } from "@zev/ui/components/textarea";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type AgentDefinition, createAgent, getAgentToolCatalog, getProviderOptions, updateAgent } from "@/api/agent";
import { useI18n } from "@/i18n";
import { AgentGuardrailTab } from "./AgentGuardrailTab";
import { AgentToolsTab } from "./AgentToolsTab";
import { type AgentFormValues, createAgentFormSchema, type EditableMcpServer } from "./agent-form-schema";

interface AgentFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editing: AgentDefinition | null;
	onSuccess: () => void;
}

export function AgentFormDialog({ open, onOpenChange, editing, onSuccess }: AgentFormDialogProps) {
	const { t } = useI18n();
	const [selectedTools, setSelectedTools] = useState<string[]>([]);
	const [approvalTools, setApprovalTools] = useState<string[]>([]);
	const [mcpServers, setMcpServers] = useState<EditableMcpServer[]>([]);

	const { data: providers = [] } = useQuery({
		queryKey: ["agentProviderOptions"],
		queryFn: getProviderOptions,
		enabled: open,
	});

	const { data: toolCatalog } = useQuery({
		queryKey: ["agentToolCatalog", editing?.id ?? 0],
		queryFn: () => getAgentToolCatalog(editing?.id),
		enabled: open,
	});

	const schema = useMemo(() => createAgentFormSchema(t), [t]);

	const form = useForm<AgentFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			code: "",
			description: "",
			provider_id: 0,
			model: "",
			system_prompt: "你是 ZEV 企业后台智能助手，请准确、简洁地协助管理员查询数据与排查问题。",
			temperature: 0.7,
			max_steps: 8,
			max_tokens: 16384,
			enable_pii_filter: true,
			require_high_risk_review: true,
			blocked_keywords_text: "",
			max_input_runes: 8000,
			max_output_runes: 16000,
			status: 0,
		},
	});

	useEffect(() => {
		if (!open) return;
		if (editing) {
			form.reset({
				name: editing.name,
				code: editing.code,
				description: editing.description || "",
				provider_id: editing.provider_id,
				model: editing.model || "",
				system_prompt: editing.system_prompt || "",
				temperature: editing.temperature ?? 0.7,
				max_steps: editing.max_steps || 8,
				max_tokens: editing.max_tokens || 16384,
				enable_pii_filter: editing.guardrail_config?.enable_pii_filter ?? true,
				require_high_risk_review: editing.guardrail_config?.require_high_risk_review ?? true,
				blocked_keywords_text: (editing.guardrail_config?.blocked_keywords || []).join(", "),
				max_input_runes: editing.guardrail_config?.max_input_runes || 8000,
				max_output_runes: editing.guardrail_config?.max_output_runes || 16000,
				status: editing.status,
			});
			setSelectedTools(editing.tool_whitelist || []);
			setApprovalTools(editing.guardrail_config?.require_approval_tools || []);
			setMcpServers(
				(editing.mcp_servers || []).map((item, idx) => ({
					...item,
					_uid: `mcp-${editing.id}-${idx}-${item.name}`,
				})),
			);
		} else {
			form.reset({
				name: "",
				code: "",
				description: "",
				provider_id: providers[0]?.id ?? 0,
				model: providers[0]?.default_model ?? "",
				system_prompt: "你是 ZEV 企业后台智能助手，请准确、简洁地协助管理员查询数据与排查问题。",
				temperature: 0.7,
				max_steps: 8,
				max_tokens: 16384,
				enable_pii_filter: true,
				require_high_risk_review: true,
				blocked_keywords_text: "",
				max_input_runes: 8000,
				max_output_runes: 16000,
				status: 0,
			});
			setSelectedTools(["system_dashboard_overview", "system_query_users"]);
			setApprovalTools(["system_send_notice_draft"]);
			setMcpServers([]);
		}
	}, [open, editing, form, providers]);

	const mutation = useMutation({
		mutationFn: async (v: AgentFormValues) => {
			const blockedKeywords = v.blocked_keywords_text
				.split(/[,\n]/)
				.map((s) => s.trim())
				.filter(Boolean);
			const payload = {
				id: editing?.id,
				name: v.name,
				code: v.code,
				description: v.description,
				provider_id: v.provider_id,
				model: v.model,
				system_prompt: v.system_prompt,
				temperature: v.temperature,
				max_steps: v.max_steps,
				max_tokens: v.max_tokens,
				tool_whitelist: selectedTools,
				mcp_servers: mcpServers.filter((s) => s.name.trim() && s.url.trim()).map(({ _uid: _, ...rest }) => rest),
				guardrail_config: {
					enable_pii_filter: v.enable_pii_filter,
					require_high_risk_review: v.require_high_risk_review,
					blocked_keywords: blockedKeywords,
					require_approval_tools: approvalTools,
					max_input_runes: v.max_input_runes,
					max_output_runes: v.max_output_runes,
				},
				status: v.status,
			};
			return editing ? updateAgent(payload) : createAgent(payload);
		},
		onSuccess: () => {
			toast.success(editing ? t("agent.common.updateSuccess") : t("agent.common.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (err: Error) => toast.error(err.message || t("agent.common.saveFailed")),
	});

	const toggleTool = (name: string) => {
		setSelectedTools((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
	};

	const toggleApprovalTool = (name: string) => {
		setApprovalTools((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
	};

	const tools = toolCatalog?.tools ?? [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{editing ? t("agent.workspace.editTitle") : t("agent.workspace.addTitle")}</DialogTitle>
					<DialogDescription>{t("agent.workspace.formDesc")}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex-1 flex flex-col min-h-0 gap-4">
						<Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="basic">{t("agent.workspace.tabBasic")}</TabsTrigger>
								<TabsTrigger value="budget">{t("agent.workspace.tabModel")}</TabsTrigger>
								<TabsTrigger value="tools">{t("agent.workspace.tabTools")}</TabsTrigger>
								<TabsTrigger value="guardrail">{t("agent.workspace.tabGuardrail")}</TabsTrigger>
							</TabsList>

							<div className="flex-1 overflow-y-auto pt-3 pr-1 space-y-4">
								<TabsContent value="basic" className="mt-0 space-y-3">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("agent.workspace.name")}</FormLabel>
													<FormControl>
														<Input placeholder="运维巡检助手" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="code"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("agent.workspace.code")}</FormLabel>
													<FormControl>
														<Input placeholder="ops-assistant" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<FormField
										control={form.control}
										name="description"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("common.description")}</FormLabel>
												<FormControl>
													<Input placeholder={t("agent.workspace.descPlaceholder")} {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="system_prompt"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("agent.workspace.systemPrompt")}</FormLabel>
												<FormControl>
													<Textarea rows={6} className="font-mono text-xs" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="status"
										render={({ field }) => (
											<FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
												<FormLabel className="mb-0">{t("common.status")}</FormLabel>
												<Switch checked={field.value === 0} onCheckedChange={(c) => field.onChange(c ? 0 : 1)} />
											</FormItem>
										)}
									/>
								</TabsContent>

								<TabsContent value="budget" className="mt-0 space-y-3">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<FormField
											control={form.control}
											name="provider_id"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("agent.workspace.provider")}</FormLabel>
													<Select
														value={field.value ? String(field.value) : ""}
														onValueChange={(val) => {
															const id = Number(val);
															field.onChange(id);
															const found = providers.find((p) => p.id === id);
															if (found && !form.getValues("model")) {
																form.setValue("model", found.default_model);
															}
														}}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder={t("agent.workspace.selectProvider")} />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{providers.map((p) => (
																<SelectItem key={p.id} value={String(p.id)}>
																	{p.name} ({p.provider_type})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="model"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("agent.workspace.model")}</FormLabel>
													<FormControl>
														<Input placeholder="留空则使用供应商默认模型" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<FormField
											control={form.control}
											name="temperature"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Temperature (0-2)</FormLabel>
													<FormControl>
														<Input
															type="number"
															step={0.1}
															min={0}
															max={2}
															value={field.value}
															onChange={(e) => field.onChange(Number(e.target.value))}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="max_steps"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("agent.workspace.maxSteps")}</FormLabel>
													<FormControl>
														<Input
															type="number"
															min={1}
															max={24}
															value={field.value}
															onChange={(e) => field.onChange(Number(e.target.value) || 8)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="max_tokens"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("agent.workspace.maxTokens")}</FormLabel>
													<FormControl>
														<Input
															type="number"
															min={512}
															max={200000}
															value={field.value}
															onChange={(e) => field.onChange(Number(e.target.value) || 16384)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</TabsContent>

								<TabsContent value="tools" className="mt-0">
									<AgentToolsTab
										tools={tools}
										selectedTools={selectedTools}
										onToggleTool={toggleTool}
										mcpServers={mcpServers}
										setMcpServers={setMcpServers}
									/>
								</TabsContent>

								<TabsContent value="guardrail" className="mt-0">
									<AgentGuardrailTab
										control={form.control}
										tools={tools}
										approvalTools={approvalTools}
										onToggleApprovalTool={toggleApprovalTool}
									/>
								</TabsContent>
							</div>
						</Tabs>

						<div className="flex justify-end gap-2 border-t pt-3">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={mutation.isPending}>
								{mutation.isPending ? t("common.saving") : t("common.save")}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
