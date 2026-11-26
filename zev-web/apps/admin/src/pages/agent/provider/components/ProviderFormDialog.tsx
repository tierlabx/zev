import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Switch } from "@zev/ui/components/switch";
import { Textarea } from "@zev/ui/components/textarea";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { type AgentProvider, createProvider, type ProviderType, updateProvider } from "@/api/agent";
import { useI18n } from "@/i18n";

interface ProviderFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editing: AgentProvider | null;
	onSuccess: () => void;
}

const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
	openai: "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com",
	gemini: "https://generativelanguage.googleapis.com/v1beta",
	ollama: "http://localhost:11434/v1",
};

export function ProviderFormDialog({ open, onOpenChange, editing, onSuccess }: ProviderFormDialogProps) {
	const { t } = useI18n();

	const schema = useMemo(
		() =>
			z.object({
				name: z.string().min(2, t("agent.provider.nameRequired")).max(100),
				provider_type: z.enum(["openai", "anthropic", "gemini", "ollama"]),
				base_url: z.string().max(255),
				api_key: z.string(),
				default_model: z.string().min(1, t("agent.provider.modelRequired")).max(100),
				modelsText: z.string(),
				timeout_sec: z.number().min(5).max(300),
				status: z.number(),
				remark: z.string().max(500),
			}),
		[t],
	);

	type FormValues = z.infer<typeof schema>;

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			provider_type: "openai",
			base_url: DEFAULT_BASE_URLS.openai,
			api_key: "",
			default_model: "gpt-4o-mini",
			modelsText: "gpt-4o-mini, gpt-4o",
			timeout_sec: 60,
			status: 0,
			remark: "",
		},
	});

	useEffect(() => {
		if (!open) return;
		if (editing) {
			form.reset({
				name: editing.name,
				provider_type: editing.provider_type,
				base_url: editing.base_url,
				api_key: "",
				default_model: editing.default_model,
				modelsText: (editing.models || []).join(", "),
				timeout_sec: editing.timeout_sec || 60,
				status: editing.status,
				remark: editing.remark || "",
			});
		} else {
			form.reset({
				name: "",
				provider_type: "openai",
				base_url: DEFAULT_BASE_URLS.openai,
				api_key: "",
				default_model: "gpt-4o-mini",
				modelsText: "gpt-4o-mini, gpt-4o",
				timeout_sec: 60,
				status: 0,
				remark: "",
			});
		}
	}, [open, editing, form]);

	const mutation = useMutation({
		mutationFn: async (values: FormValues) => {
			const models = values.modelsText
				.split(/[,\n]/)
				.map((s) => s.trim())
				.filter(Boolean);
			const payload = {
				id: editing?.id,
				name: values.name,
				provider_type: values.provider_type,
				base_url: values.base_url,
				api_key: values.api_key || undefined,
				default_model: values.default_model,
				models,
				timeout_sec: values.timeout_sec,
				status: values.status,
				remark: values.remark,
			};
			return editing ? updateProvider(payload) : createProvider(payload);
		},
		onSuccess: () => {
			toast.success(editing ? t("agent.common.updateSuccess") : t("agent.common.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (err: Error) => {
			toast.error(err.message || t("agent.common.saveFailed"));
		},
	});

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="mb-4 space-y-1">
				<h2 className="text-base font-semibold">
					{editing ? t("agent.provider.editTitle") : t("agent.provider.addTitle")}
				</h2>
				<p className="text-xs text-muted-foreground">{t("agent.provider.formDesc")}</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("agent.provider.name")}</FormLabel>
									<FormControl>
										<Input placeholder="OpenAI Prod / Ollama Local" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="provider_type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("agent.provider.type")}</FormLabel>
									<Select
										value={field.value}
										onValueChange={(val: ProviderType) => {
											field.onChange(val);
											if (!editing) {
												form.setValue("base_url", DEFAULT_BASE_URLS[val]);
											}
										}}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="openai">OpenAI / 兼容协议</SelectItem>
											<SelectItem value="anthropic">Anthropic Claude</SelectItem>
											<SelectItem value="gemini">Google Gemini</SelectItem>
											<SelectItem value="ollama">Ollama 本地部署</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="base_url"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.provider.baseUrl")}</FormLabel>
								<FormControl>
									<Input placeholder="https://api.openai.com/v1" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<FormField
							control={form.control}
							name="default_model"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("agent.provider.defaultModel")}</FormLabel>
									<FormControl>
										<Input placeholder="gpt-4o-mini" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="timeout_sec"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("agent.provider.timeoutSec")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={5}
											max={300}
											value={field.value}
											onChange={(e) => field.onChange(Number(e.target.value) || 60)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="api_key"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.provider.apiKey")}</FormLabel>
								<FormControl>
									<Input
										type="password"
										autoComplete="new-password"
										placeholder={
											editing?.has_api_key
												? `${t("agent.provider.keepKeyPlaceholder")} (${editing.api_key_masked})`
												: "sk-..."
										}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="modelsText"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.provider.models")}</FormLabel>
								<FormControl>
									<Input placeholder="gpt-4o-mini, gpt-4o, deepseek-chat" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="remark"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("common.remark")}</FormLabel>
								<FormControl>
									<Textarea rows={2} placeholder={t("agent.provider.remarkPlaceholder")} {...field} />
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
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>{field.value === 0 ? t("common.normal") : t("common.disabled")}</span>
									<Switch checked={field.value === 0} onCheckedChange={(c) => field.onChange(c ? 0 : 1)} />
								</div>
							</FormItem>
						)}
					/>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? t("common.saving") : t("common.save")}
						</Button>
					</div>
				</form>
			</Form>
		</Modal>
	);
}
