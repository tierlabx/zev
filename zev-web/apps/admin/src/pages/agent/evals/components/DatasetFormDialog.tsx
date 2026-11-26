import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Textarea } from "@zev/ui/components/textarea";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { type AgentEvalDataset, createEvalDataset, getAgentOptions, updateEvalDataset } from "@/api/agent";
import { useI18n } from "@/i18n";

interface DatasetFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editing: AgentEvalDataset | null;
	onSuccess: () => void;
}

export function DatasetFormDialog({ open, onOpenChange, editing, onSuccess }: DatasetFormDialogProps) {
	const { t } = useI18n();
	const { data: agents = [] } = useQuery({
		queryKey: ["agentOptions"],
		queryFn: getAgentOptions,
		enabled: open,
	});

	const schema = useMemo(
		() =>
			z.object({
				name: z.string().min(2, t("agent.evals.datasetNameRequired")).max(128),
				description: z.string().max(500),
				agent_id: z.number().min(1, t("agent.evals.agentRequired")),
				pass_threshold: z.number().min(0.1).max(1),
			}),
		[t],
	);

	type FormValues = z.infer<typeof schema>;

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", description: "", agent_id: 0, pass_threshold: 0.8 },
	});

	useEffect(() => {
		if (!open) return;
		if (editing) {
			form.reset({
				name: editing.name,
				description: editing.description || "",
				agent_id: editing.agent_id,
				pass_threshold: editing.pass_threshold || 0.8,
			});
		} else {
			form.reset({
				name: "",
				description: "",
				agent_id: agents[0]?.id ?? 0,
				pass_threshold: 0.8,
			});
		}
	}, [open, editing, form, agents]);

	const mutation = useMutation({
		mutationFn: (values: FormValues) =>
			editing ? updateEvalDataset({ id: editing.id, ...values }) : createEvalDataset(values),
		onSuccess: () => {
			toast.success(editing ? t("agent.common.updateSuccess") : t("agent.common.createSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="mb-4 space-y-1">
				<h2 className="text-base font-semibold">
					{editing ? t("agent.evals.editDataset") : t("agent.evals.addDataset")}
				</h2>
			</div>
			<Form {...form}>
				<form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("agent.evals.datasetName")}</FormLabel>
								<FormControl>
									<Input placeholder="核心运维回归集" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<FormField
							control={form.control}
							name="agent_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("agent.evals.targetAgent")}</FormLabel>
									<Select
										value={field.value ? String(field.value) : ""}
										onValueChange={(v) => field.onChange(Number(v))}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder={t("agent.playground.selectAgent")} />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{agents.map((a) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.name}
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
							name="pass_threshold"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("agent.evals.passThreshold")} (0.1 - 1.0)</FormLabel>
									<FormControl>
										<Input
											type="number"
											step={0.05}
											min={0.1}
											max={1}
											value={field.value}
											onChange={(e) => field.onChange(Number(e.target.value) || 0.8)}
										/>
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
									<Textarea rows={2} {...field} />
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
