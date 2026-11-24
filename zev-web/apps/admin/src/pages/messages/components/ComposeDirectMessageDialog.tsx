import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@zev/ui/components/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Textarea } from "@zev/ui/components/textarea";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import * as z from "zod";
import { getReceiverOptions, sendDirectMessage } from "@/api/system/notice";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useI18n } from "@/i18n";

interface ComposeDirectMessageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function ComposeDirectMessageDialog({ open, onOpenChange, onSuccess }: ComposeDirectMessageDialogProps) {
	const { t } = useI18n();
	const [receiverKeyword, setReceiverKeyword] = useState("");
	const [debouncedKeyword] = useDebounce(receiverKeyword, 250);

	const schema = useMemo(
		() =>
			z.object({
				receiverIds: z.array(z.number()).min(1, t("notice.receiverRequired")),
				level: z.number(),
				title: z.string().trim().min(1, t("notice.titleRequired")).max(120, t("notice.titleMax")),
				content: z.string().trim().min(1, t("notice.contentRequired")),
				link: z
					.string()
					.trim()
					.refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")), t("notice.linkInvalid")),
			}),
		[t],
	);

	type FormValues = z.infer<typeof schema>;

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			receiverIds: [],
			level: 0,
			title: "",
			content: "",
			link: "",
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				receiverIds: [],
				level: 0,
				title: "",
				content: "",
				link: "",
			});
			setReceiverKeyword("");
		}
	}, [open, form]);

	const { data: receivers = [], isLoading: loadingReceivers } = useQuery({
		queryKey: ["noticeReceivers", debouncedKeyword],
		queryFn: () => getReceiverOptions(debouncedKeyword || undefined),
		enabled: open,
	});

	const sendMutation = useMutation({
		mutationFn: sendDirectMessage,
		onSuccess: () => {
			toast.success(t("notice.sendDirectSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.sendDirectFailed"));
		},
	});

	const handleSubmit = (values: FormValues) => {
		sendMutation.mutate({
			receiverIds: values.receiverIds,
			level: values.level,
			title: values.title,
			content: values.content,
			link: values.link || undefined,
		});
	};

	const selectedIds = form.watch("receiverIds");

	const toggleReceiver = (id: number) => {
		const next = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
		form.setValue("receiverIds", next, { shouldValidate: true });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[540px]">
				<DialogHeader>
					<DialogTitle>{t("notice.composeDirectTitle")}</DialogTitle>
					<DialogDescription>{t("notice.composeDirectDesc")}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="receiverIds"
							render={() => (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>
											{t("notice.receivers")} ({selectedIds.length})
										</FormLabel>
									</div>
									<div className="rounded-md border p-2.5 space-y-2">
										<div className="relative">
											<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												value={receiverKeyword}
												onChange={(e) => setReceiverKeyword(e.target.value)}
												placeholder={t("notice.searchReceiverPlaceholder")}
												className="h-8 pl-8 text-xs"
											/>
										</div>
										<div className="max-h-36 overflow-y-auto space-y-1 pr-1">
											{loadingReceivers ? (
												<div className="py-4 text-center text-xs text-muted-foreground">{t("common.loading")}</div>
											) : receivers.length > 0 ? (
												receivers.map((user) => {
													const checked = selectedIds.includes(user.id);
													const inputId = `direct-receiver-${user.id}`;
													return (
														<div
															key={user.id}
															className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/60 text-sm"
														>
															<label
																htmlFor={inputId}
																className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
															>
																<Checkbox
																	id={inputId}
																	checked={checked}
																	onCheckedChange={() => toggleReceiver(user.id)}
																/>
																<span className="truncate font-medium">{user.nickname || user.username}</span>
																<span className="text-xs text-muted-foreground truncate">@{user.username}</span>
															</label>
															{user.deptName ? (
																<span className="text-[11px] text-muted-foreground shrink-0 ml-2">{user.deptName}</span>
															) : null}
														</div>
													);
												})
											) : (
												<div className="py-4 text-center text-xs text-muted-foreground">{t("common.noData")}</div>
											)}
										</div>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem className="sm:col-span-2">
										<FormLabel>{t("notice.title")}</FormLabel>
										<FormControl>
											<Input placeholder={t("notice.titlePlaceholder")} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="level"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("notice.level")}</FormLabel>
										<Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="0">{t("notice.levelNormal")}</SelectItem>
												<SelectItem value="1">{t("notice.levelImportant")}</SelectItem>
												<SelectItem value="2">{t("notice.levelUrgent")}</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="content"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("notice.content")}</FormLabel>
									<FormControl>
										<Textarea rows={4} placeholder={t("notice.contentPlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="link"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("notice.linkOptional")}</FormLabel>
									<FormControl>
										<Input placeholder={t("notice.linkPlaceholder")} className="font-mono text-xs" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={sendMutation.isPending}>
								{sendMutation.isPending ? t("common.submitting") : t("notice.sendDirectBtn")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
