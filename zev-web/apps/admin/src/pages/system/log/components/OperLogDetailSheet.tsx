import { useQuery } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@zev/ui/components/sheet";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getOperLogDetail, type SysOperLog } from "@/api/system/log";
import { useI18n } from "@/i18n";
import { formatJsonString } from "@/utils/download";

interface OperLogDetailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	logId: number | null;
	initialData?: SysOperLog | null;
}

export function OperLogDetailSheet({ open, onOpenChange, logId, initialData }: OperLogDetailSheetProps) {
	const { locale, t } = useI18n();
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const { data, isFetching } = useQuery({
		queryKey: ["operLogDetail", logId],
		queryFn: () => getOperLogDetail(logId as number),
		enabled: open && logId !== null && logId > 0,
	});

	const detail = data ?? initialData ?? null;

	const handleCopy = async (key: string, text?: string) => {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			setCopiedKey(key);
			toast.success(t("log.copySuccess"));
			window.setTimeout(() => {
				setCopiedKey((prev) => (prev === key ? null : prev));
			}, 1500);
		} catch {
			toast.error(t("log.copyFailed"));
		}
	};

	const renderCodeBlock = (key: string, title: string, content?: string) => {
		const formatted = formatJsonString(content);
		return (
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">{title}</span>
					{formatted ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs"
							onClick={() => handleCopy(key, formatted)}
						>
							{copiedKey === key ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
							{t("log.copy")}
						</Button>
					) : null}
				</div>
				<pre className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-all">
					{formatted || t("log.emptyPayload")}
				</pre>
			</div>
		);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">
				<SheetHeader className="border-b px-6 py-4 text-left">
					<div className="flex items-center gap-2 pr-6">
						<SheetTitle className="text-base">{t("log.operDetailTitle")}</SheetTitle>
						{detail ? (
							detail.status === 1 ? (
								<Badge
									variant="default"
									className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20 shadow-none"
								>
									{t("log.success")}
								</Badge>
							) : (
								<Badge variant="destructive">{t("log.failed")}</Badge>
							)
						) : null}
					</div>
					<SheetDescription className="text-xs">
						{detail ? `${detail.module} · ${detail.action}` : t("common.loading")}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
					{detail ? (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border bg-card p-4 text-sm">
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">{t("log.operator")}</div>
									<div className="font-medium">{detail.operator || "-"}</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">{t("log.ip")}</div>
									<div className="font-mono text-xs">{detail.ip || "-"}</div>
								</div>
								<div className="space-y-1 sm:col-span-2">
									<div className="text-xs text-muted-foreground">{t("log.requestTarget")}</div>
									<div className="flex items-center gap-2 font-mono text-xs break-all">
										<Badge variant="outline" className="shrink-0 font-mono text-[11px]">
											{detail.method}
										</Badge>
										<span>{detail.url}</span>
									</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">{t("log.clientEnv")}</div>
									<div className="text-xs">
										{detail.browser || "Unknown"} / {detail.os || "Unknown"}
									</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">{t("log.latency")}</div>
									<div className="font-mono text-xs">{detail.latency} ms</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">{t("log.operTime")}</div>
									<div className="text-xs">
										{detail.createdAt ? new Date(detail.createdAt).toLocaleString(locale) : "-"}
									</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">{t("log.requestId")}</div>
									<div className="flex items-center gap-1.5 font-mono text-xs break-all">
										<span>{detail.requestId || "-"}</span>
										{detail.requestId ? (
											<button
												type="button"
												onClick={() => handleCopy("requestId", detail.requestId)}
												className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
												title={t("log.copy")}
											>
												{copiedKey === "requestId" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
											</button>
										) : null}
									</div>
								</div>
							</div>

							{detail.errorMsg ? (
								<div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
									<div className="text-xs font-medium text-destructive">{t("log.errorMsg")}</div>
									<div className="text-xs text-destructive break-all whitespace-pre-wrap">{detail.errorMsg}</div>
								</div>
							) : null}

							{detail.queryParams ? renderCodeBlock("query", t("log.queryParams"), detail.queryParams) : null}
							{renderCodeBlock("reqBody", t("log.requestBody"), detail.requestBody)}
							{renderCodeBlock("respBody", t("log.responseBody"), detail.responseBody)}

							{detail.userAgent ? (
								<div className="space-y-1">
									<div className="text-xs font-medium text-muted-foreground">{t("log.userAgent")}</div>
									<div className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground break-all">
										{detail.userAgent}
									</div>
								</div>
							) : null}

							{isFetching ? <div className="text-[11px] text-muted-foreground">{t("common.loading")}</div> : null}
						</>
					) : (
						<div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
