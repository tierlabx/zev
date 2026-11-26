import { useMutation } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Check, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type AgentApproval, decideApproval } from "@/api/agent";
import { Auth } from "@/components/auth";
import { useI18n } from "@/i18n";
import { formatJsonString } from "@/utils/download";

interface ApprovalActionCardProps {
	approval: AgentApproval;
	highlighted?: boolean;
	onDecided: (updated: AgentApproval) => void;
}

export function ApprovalActionCard({ approval, highlighted = false, onDecided }: ApprovalActionCardProps) {
	const { t } = useI18n();
	const [comment, setComment] = useState("");
	const cardRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (highlighted && cardRef.current) {
			cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}, [highlighted]);

	const decideMutation = useMutation({
		mutationFn: (approved: boolean) => decideApproval(approval.id, { approved, comment }),
		onSuccess: (updated) => {
			toast.success(
				updated.status === "approved" ? t("agent.approval.approvedToast") : t("agent.approval.rejectedToast"),
			);
			onDecided(updated);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const isPending = approval.status === "pending";

	return (
		<div
			ref={cardRef}
			className={`rounded-lg border bg-card p-3 space-y-2.5 text-xs transition-shadow ${
				highlighted ? "border-foreground ring-2 ring-foreground/30" : "border-foreground/20"
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
					<span className="font-medium truncate">{t("agent.approval.cardTitle")}</span>
					<Badge variant="outline" className="font-mono text-[10px]">
						{approval.tool_name}
					</Badge>
				</div>
				<Badge
					variant={
						approval.status === "approved"
							? "secondary"
							: approval.status === "rejected" || approval.status === "expired"
								? "destructive"
								: "default"
					}
					className="text-[10px] shrink-0"
				>
					{approval.status}
				</Badge>
			</div>

			<div className="text-muted-foreground">{approval.reason}</div>

			<pre className="max-h-28 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
				{formatJsonString(approval.tool_args_json) || "{}"}
			</pre>

			{isPending ? (
				<Auth permission="agent:approval:decide">
					<div className="flex flex-wrap items-center gap-2 pt-1">
						<Input
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder={t("agent.approval.commentPlaceholder")}
							className="h-8 flex-1 min-w-[160px] text-xs"
						/>
						<Button
							size="sm"
							variant="outline"
							className="h-8 text-destructive hover:text-destructive"
							disabled={decideMutation.isPending}
							onClick={() => decideMutation.mutate(false)}
						>
							<X className="mr-1 h-3.5 w-3.5" />
							{t("agent.approval.reject")}
						</Button>
						<Button
							size="sm"
							className="h-8"
							disabled={decideMutation.isPending}
							onClick={() => decideMutation.mutate(true)}
						>
							<Check className="mr-1 h-3.5 w-3.5" />
							{t("agent.approval.approve")}
						</Button>
					</div>
				</Auth>
			) : (
				<div className="text-[11px] text-muted-foreground">
					{approval.approver_name ? `${approval.approver_name} · ` : ""}
					{approval.decision_comment || approval.status}
				</div>
			)}
		</div>
	);
}
