import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Textarea } from "@zev/ui/components/textarea";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { type AgentEvalCase, createEvalCase, updateEvalCase } from "@/api/agent";
import { useI18n } from "@/i18n";

interface CaseFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	datasetId: number;
	editing: AgentEvalCase | null;
	onSuccess: () => void;
}

export function CaseFormDialog({ open, onOpenChange, datasetId, editing, onSuccess }: CaseFormDialogProps) {
	const { t } = useI18n();

	const schema = useMemo(
		() =>
			z.object({
				name: z.string().min(2, t("agent.evals.caseNameRequired")).max(128),
				input: z.string().min(1, t("agent.evals.caseInputRequired")),
				expected_pattern: z.string().max(500),
				expected_json_schema: z.string(),
				judge_criteria: z.string(),
				tags: z.string().max(255),
				sort: z.number(),
			}),
		[t],
	);

	type FormValues = z.infer<typeof schema>;

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			input: "",
			expected_pattern: "",
			expected_json_schema: "",
			judge_criteria: "",
			tags: "",
			sort: 0,
		},
	});

	useEffect(() => {
		if (!open) return;
		if (editing) {
			form.reset({
				name: editing.name,
				input: editing.input,
				expected_pattern: editing.expected_pattern || "",
				expected_json_schema: editing.expected_json_schema || "",
				judge_criteria: editing.judge_criteria || "",
				tags: editing.tags || "",
				sort: editing.sort || 0,
			});
		} else {
			form.reset({
				name: "",
				input: "",
				expected_pattern: "",
				expected_json_schema: "",
				judge_criteria: "",
				tags: "",
				sort: 0,
			});
		}
	}, [open, editing, form]);

	const mutation = useMutation({
		mutationFn: (values: FormValues) =>
			editing
				? updateEvalCase({ id: editing.id, dataset_id: datasetId, ...values })
				: createEvalCase({ dataset_id: datasetId, ...values }),
		onSuccess: () => {
			toast.success(editing ? t("agent.common.updateSuccess") : t("agent.common.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="mb-4">
				<h2 className="text-base font-semibold">{editing ? t("agent.evals.editCase") : t("agent.evals.addCase")}</h2>
			</div>
			<Form {...form}>
				<form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="sm:col-span-2">
									<FormLabel>{t("agent.evals.caseName")}</FormLabel>
									<FormControl>
										<Input placeholder="查询部门概况准确性" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="tags"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("agent.evals.tags")}</FormLabel>
									<FormControl>
										<Input placeholder="smoke, rbac" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="input"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.evals.caseInput")}</FormLabel>
								<FormControl>
									<Textarea rows={3} placeholder="请统计当前可见的用户总数与部门总数" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="expected_pattern"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.evals.expectedPattern")}</FormLabel>
								<FormControl>
									<Input className="font-mono text-xs" placeholder="例如: 部门|users" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="expected_json_schema"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.evals.expectedJsonSchema")}</FormLabel>
								<FormControl>
									<Textarea
										rows={2}
										className="font-mono text-xs"
										placeholder='{"required":["total"],"properties":{"total":{"type":"number"}}}'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="judge_criteria"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.evals.judgeCriteria")}</FormLabel>
								<FormControl>
									<Textarea rows={2} placeholder="回答必须基于工具返回真实数据且条理清晰" {...field} />
								</FormControl>
								<FormMessage />
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
