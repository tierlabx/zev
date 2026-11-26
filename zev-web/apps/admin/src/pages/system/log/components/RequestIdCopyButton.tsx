import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

interface RequestIdCopyButtonProps {
	requestId?: string;
}

/**
 * 审计表格中复用的 Request ID 一键复制按钮
 */
export function RequestIdCopyButton({ requestId }: RequestIdCopyButtonProps) {
	const { t } = useI18n();
	const [copied, setCopied] = useState(false);

	if (!requestId) {
		return <span>-</span>;
	}

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(requestId);
			setCopied(true);
			toast.success(t("log.copySuccess"));
			window.setTimeout(() => {
				setCopied(false);
			}, 1500);
		} catch {
			toast.error(t("log.copyFailed"));
		}
	};

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
			title={requestId}
		>
			<span className="max-w-[84px] truncate">{requestId}</span>
			{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
		</button>
	);
}
