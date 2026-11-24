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
import { type DeptTreeNode, getDeptTree } from "@/api/system/dept";
import { createNotice, getReceiverOptions, type ManageNoticeItem, updateNotice } from "@/api/system/notice";
import { getRoleList } from "@/api/system/role";
import { Checkbox } from "@/components/zev-table/checkbox";
import { usePermission } from "@/hooks/use-permission";
import { useI18n } from "@/i18n";

interface NoticeFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingNotice: ManageNoticeItem | null;
	onSuccess: () => void;
}

export function NoticeFormDialog({ open, onOpenChange, editingNotice, onSuccess }: NoticeFormDialogProps) {
	const { t } = useI18n();
	const { hasAllDataScope } = usePermission();
	const [userSearch, setUserSearch] = useState("");
	const [debouncedUserSearch] = useDebounce(userSearch, 250);
	const isPublishedEditing = editingNotice?.status === 1;

	const schema = useMemo(
		() =>
			z
				.object({
					title: z.string().trim().min(1, t("notice.titleRequired")).max(120, t("notice.titleMax")),
					type: z.number(),
					level: z.number(),
					targetType: z.number(),
					targetIds: z.array(z.number()),
					link: z
						.string()
						.trim()
						.refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")), t("notice.linkInvalid")),
					content: z.string().trim().min(1, t("notice.contentRequired")),
				})
				.superRefine((vals, ctx) => {
					if (vals.targetType !== 1 && vals.targetIds.length === 0) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: t("notice.targetRequired"),
							path: ["targetIds"],
						});
					}
				}),
		[t],
	);

	type FormValues = z.infer<typeof schema>;

	const defaultTargetType = hasAllDataScope ? 1 : 2;

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			title: "",
			type: 1,
			level: 0,
			targetType: defaultTargetType,
			targetIds: [],
			link: "",
			content: "",
		},
	});

	useEffect(() => {
		if (!open) return;
		if (editingNotice) {
			form.reset({
				title: editingNotice.title,
				type: editingNotice.type,
				level: editingNotice.level,
				targetType: editingNotice.targetType,
				targetIds: editingNotice.targetIds ?? [],
				link: editingNotice.link ?? "",
				content: editingNotice.content,
			});
		} else {
			form.reset({
				title: "",
				type: 1,
				level: 0,
				targetType: hasAllDataScope ? 1 : 2,
				targetIds: [],
				link: "",
				content: "",
			});
		}
		setUserSearch("");
	}, [open, editingNotice, form, hasAllDataScope]);

	const targetType = form.watch("targetType");
	const targetIds = form.watch("targetIds");

	const { data: deptTree = [] } = useQuery({
		queryKey: ["depts"],
		queryFn: () => getDeptTree(),
		enabled: open && targetType === 2,
	});

	const { data: roleData } = useQuery({
		queryKey: ["roles"],
		queryFn: () => getRoleList({ page: 1, pageSize: 1000 }),
		enabled: open && targetType === 3,
	});

	const { data: receiverUsers = [] } = useQuery({
		queryKey: ["noticeReceivers", debouncedUserSearch],
		queryFn: () => getReceiverOptions(debouncedUserSearch || undefined),
		enabled: open && targetType === 4,
	});

	const createMutation = useMutation({
		mutationFn: createNotice,
		onSuccess: (_, variables) => {
			toast.success(variables.publishNow ? t("notice.publishSuccess") : t("notice.saveDraftSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.saveFailed"));
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateNotice,
		onSuccess: () => {
			toast.success(t("notice.updateSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (err: Error) => {
			toast.error(err.message || t("notice.saveFailed"));
		},
	});

	const toggleTargetId = (id: number) => {
		if (isPublishedEditing) return;
		const next = targetIds.includes(id) ? targetIds.filter((item) => item !== id) : [...targetIds, id];
		form.setValue("targetIds", next, { shouldValidate: true });
	};

	const submitForm = (publishNow: boolean) =>
		form.handleSubmit((values) => {
			if (editingNotice) {
				updateMutation.mutate({
					id: editingNotice.id,
					title: values.title,
					content: values.content,
					type: values.type,
					level: values.level,
					targetType: values.targetType,
					targetIds: values.targetType === 1 ? [] : values.targetIds,
					link: values.link || undefined,
				});
				return;
			}
			createMutation.mutate({
				title: values.title,
				content: values.content,
				type: values.type,
				level: values.level,
				targetType: values.targetType,
				targetIds: values.targetType === 1 ? [] : values.targetIds,
				link: values.link || undefined,
				publishNow,
			});
		});

	const renderDeptNodes = (nodes: DeptTreeNode[], level = 0): React.ReactNode =>
		nodes.map((node) => {
			const checked = targetIds.includes(node.ID);
			const inputId = `notice-dept-${node.ID}`;
			return (
				<div key={node.ID}>
					<div
						className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/60 text-sm"
						style={{ paddingLeft: `${level * 16 + 8}px` }}
					>
						<label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
							<Checkbox
								id={inputId}
								disabled={isPublishedEditing}
								checked={checked}
								onCheckedChange={() => toggleTargetId(node.ID)}
							/>
							<span className="truncate">{node.name}</span>
						</label>
						<span className="text-[11px] font-mono text-muted-foreground shrink-0">{node.code}</span>
					</div>
					{node.children && node.children.length > 0 ? renderDeptNodes(node.children, level + 1) : null}
				</div>
			);
		});

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{editingNotice ? t("notice.editTitle") : t("notice.createTitle")}</DialogTitle>
					<DialogDescription>
						{isPublishedEditing ? t("notice.publishedEditHint") : t("notice.formDesc")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={submitForm(false)} className="space-y-4 overflow-y-auto pr-1">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("notice.title")}</FormLabel>
									<FormControl>
										<Input placeholder={t("notice.titlePlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("notice.type")}</FormLabel>
										<Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="1">{t("notice.typeSystem")}</SelectItem>
												<SelectItem value="2">{t("notice.typeReminder")}</SelectItem>
												<SelectItem value="3">{t("notice.typePrivate")}</SelectItem>
											</SelectContent>
										</Select>
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

							<FormField
								control={form.control}
								name="targetType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("notice.targetType")}</FormLabel>
										<Select
											disabled={isPublishedEditing}
											value={String(field.value)}
											onValueChange={(v) => {
												field.onChange(Number(v));
												form.setValue("targetIds", [], { shouldValidate: false });
											}}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{hasAllDataScope ? <SelectItem value="1">{t("notice.targetAll")}</SelectItem> : null}
												<SelectItem value="2">{t("notice.targetDept")}</SelectItem>
												{hasAllDataScope ? <SelectItem value="3">{t("notice.targetRole")}</SelectItem> : null}
												<SelectItem value="4">{t("notice.targetUser")}</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{targetType === 1 ? (
							<div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
								{t("notice.targetAllHint")}
							</div>
						) : (
							<FormField
								control={form.control}
								name="targetIds"
								render={() => (
									<FormItem>
										<FormLabel>
											{t("notice.targetSelection")} ({targetIds.length})
										</FormLabel>
										<div className="rounded-md border p-2.5 space-y-2">
											{targetType === 4 ? (
												<div className="relative">
													<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
													<Input
														value={userSearch}
														onChange={(e) => setUserSearch(e.target.value)}
														placeholder={t("notice.searchReceiverPlaceholder")}
														className="h-8 pl-8 text-xs"
													/>
												</div>
											) : null}

											<div className="max-h-40 overflow-y-auto space-y-1">
												{targetType === 2 ? (
													deptTree.length > 0 ? (
														renderDeptNodes(deptTree)
													) : (
														<div className="py-4 text-center text-xs text-muted-foreground">{t("common.noData")}</div>
													)
												) : null}

												{targetType === 3
													? (roleData?.list ?? []).map((role) => {
															const checked = targetIds.includes(role.ID);
															const inputId = `notice-role-${role.ID}`;
															return (
																<div
																	key={role.ID}
																	className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/60 text-sm"
																>
																	<label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer flex-1">
																		<Checkbox
																			id={inputId}
																			disabled={isPublishedEditing}
																			checked={checked}
																			onCheckedChange={() => toggleTargetId(role.ID)}
																		/>
																		<span>{role.name}</span>
																	</label>
																	<span className="text-[11px] font-mono text-muted-foreground">{role.code}</span>
																</div>
															);
														})
													: null}

												{targetType === 4
													? receiverUsers.map((user) => {
															const checked = targetIds.includes(user.id);
															const inputId = `notice-user-${user.id}`;
															return (
																<div
																	key={user.id}
																	className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/60 text-sm"
																>
																	<label
																		htmlFor={inputId}
																		className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
																	>
																		<Checkbox
																			id={inputId}
																			disabled={isPublishedEditing}
																			checked={checked}
																			onCheckedChange={() => toggleTargetId(user.id)}
																		/>
																		<span className="truncate font-medium">{user.nickname || user.username}</span>
																		<span className="text-xs text-muted-foreground truncate">@{user.username}</span>
																	</label>
																	{user.deptName ? (
																		<span className="text-[11px] text-muted-foreground shrink-0">{user.deptName}</span>
																	) : null}
																</div>
															);
														})
													: null}
											</div>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

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

						<FormField
							control={form.control}
							name="content"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("notice.content")}</FormLabel>
									<FormControl>
										<Textarea rows={5} placeholder={t("notice.contentPlaceholder")} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="gap-2 pt-2">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								{t("common.cancel")}
							</Button>
							{editingNotice ? (
								<Button type="submit" disabled={isPending}>
									{isPending ? t("common.saving") : t("common.save")}
								</Button>
							) : (
								<>
									<Button type="submit" variant="outline" disabled={isPending}>
										{t("notice.saveDraft")}
									</Button>
									<Button type="button" disabled={isPending} onClick={() => void submitForm(true)()}>
										{isPending ? t("common.submitting") : t("notice.publishNow")}
									</Button>
								</>
							)}
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
