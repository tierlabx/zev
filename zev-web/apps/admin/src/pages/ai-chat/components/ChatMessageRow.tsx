import { ShimmeringText } from "@animate-ui/react/primitives/texts/shimmering";
import { Avatar, AvatarFallback } from "@zev/ui/components/avatar";
import { Bubble, BubbleContent } from "@zev/ui/components/bubble";
import { Button } from "@zev/ui/components/button";
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from "@zev/ui/components/code-block";
import { Marker, MarkerContent, MarkerIcon } from "@zev/ui/components/marker";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "@zev/ui/components/message";
import {
	Trace,
	TraceCollapsible,
	TraceCollapsibleContent,
	TraceCollapsibleTrigger,
	TraceIcon,
	TraceLine,
	TraceTitle,
} from "@zev/ui/components/trace";
import { AlertTriangle, Bot, Brain, Check, Copy, RotateCcw, ShieldAlert, User, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentApproval } from "@/api/agent";
import { useI18n } from "@/i18n";
import { ApprovalActionCard } from "@/pages/agent/playground/components/ApprovalActionCard";
import { formatJsonString } from "@/utils/download";
import type { ChatToolStep, ChatTurn } from "../types";
import { ChatMarkdown } from "./ChatMarkdown";

interface ChatMessageRowProps {
	turn: ChatTurn;
	isLastAssistant: boolean;
	isStreamingGlobal: boolean;
	userInitials: string;
	onRegenerate?: () => void;
	onApprovalDecided: (turnId: string, updated: AgentApproval) => void;
}

function ToolStepItem({ step }: { step: ChatToolStep }) {
	const { t } = useI18n();

	const status: "running" | "error" | undefined =
		step.status === "running" ? "running" : step.status === "blocked" ? "error" : undefined;

	const title =
		step.status === "running"
			? t("aiChat.toolRunning", { name: step.toolName })
			: step.status === "blocked"
				? t("aiChat.toolBlocked", { name: step.toolName })
				: step.status === "waiting_approval"
					? t("aiChat.toolWaitingApproval", { name: step.toolName })
					: t("aiChat.toolDone", { name: step.toolName });

	const line = (
		<TraceLine status={status}>
			<TraceIcon>
				<Wrench />
			</TraceIcon>
			<TraceTitle>{title}</TraceTitle>
		</TraceLine>
	);

	// 工具仍在执行且无结果时直接展示单行 TraceLine，避免渲染空的折叠面板
	if (step.status === "running" && step.result === undefined) {
		return line;
	}

	return (
		<TraceCollapsible>
			<TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
			<TraceCollapsibleContent className="space-y-2">
				<CodeBlock size="sm">
					<CodeBlockHeader>
						<CodeBlockTitle>{t("aiChat.toolArgsLabel")}</CodeBlockTitle>
					</CodeBlockHeader>
					<CodeBlockContent wrap className="max-h-48">
						{formatJsonString(step.arguments) || "{}"}
					</CodeBlockContent>
				</CodeBlock>
				{step.result !== undefined ? (
					<CodeBlock size="sm" variant={step.status === "blocked" ? "destructive" : "default"}>
						<CodeBlockHeader>
							<CodeBlockTitle>{t("aiChat.toolResultLabel")}</CodeBlockTitle>
						</CodeBlockHeader>
						<CodeBlockContent wrap className="max-h-64">
							{step.result || "{}"}
						</CodeBlockContent>
					</CodeBlock>
				) : null}
			</TraceCollapsibleContent>
		</TraceCollapsible>
	);
}

export function ChatMessageRow({
	turn,
	isLastAssistant,
	isStreamingGlobal,
	userInitials,
	onRegenerate,
	onApprovalDecided,
}: ChatMessageRowProps) {
	const { t } = useI18n();
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 1800);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const handleCopy = () => {
		if (!turn.content) return;
		navigator.clipboard
			.writeText(turn.content)
			.then(() => setCopied(true))
			.catch(() => {});
	};

	if (turn.role === "user") {
		return (
			<Message align="end">
				<MessageAvatar>
					<Avatar className="size-8 border border-border">
						<AvatarFallback className="bg-foreground text-background text-xs font-medium">
							{userInitials || <User className="size-4" />}
						</AvatarFallback>
					</Avatar>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="default" align="end">
						<BubbleContent className="whitespace-pre-wrap">{turn.content}</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		);
	}

	const isTurnStreaming = turn.status === "streaming";
	const hasTraceItems = Boolean(turn.reasoning) || turn.toolSteps.length > 0;

	return (
		<Message align="start">
			<MessageAvatar className="self-start">
				<div className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground">
					<Bot className="size-4" />
				</div>
			</MessageAvatar>

			<MessageContent>
				{hasTraceItems ? (
					<Trace>
						{turn.reasoning ? (
							<TraceCollapsible defaultOpen={isTurnStreaming && !turn.content}>
								<TraceCollapsibleTrigger>
									<TraceLine status={isTurnStreaming && !turn.content ? "running" : undefined}>
										<TraceIcon>
											<Brain />
										</TraceIcon>
										<TraceTitle>
											{isTurnStreaming && !turn.content ? t("aiChat.reasoningStreaming") : t("aiChat.reasoningTitle")}
										</TraceTitle>
									</TraceLine>
								</TraceCollapsibleTrigger>
								<TraceCollapsibleContent>
									<div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{turn.reasoning}</div>
								</TraceCollapsibleContent>
							</TraceCollapsible>
						) : null}

						{turn.toolSteps.map((step) => (
							<ToolStepItem key={step.id} step={step} />
						))}
					</Trace>
				) : null}

				{turn.approvals.map((ap) => (
					<ApprovalActionCard key={ap.id} approval={ap} onDecided={(updated) => onApprovalDecided(turn.id, updated)} />
				))}

				{turn.guardrailNotes.map((note) => (
					<Marker key={note.id} variant="border" className="border-destructive/30 text-destructive text-xs">
						<MarkerIcon>{turn.status === "error" ? <AlertTriangle /> : <ShieldAlert />}</MarkerIcon>
						<MarkerContent>{note.text}</MarkerContent>
					</Marker>
				))}

				{turn.content ? (
					<Bubble variant="ghost" align="start">
						<BubbleContent>
							<ChatMarkdown content={turn.content} />
						</BubbleContent>
					</Bubble>
				) : isTurnStreaming ? (
					<div className="py-1">
						<ShimmeringText text={t("aiChat.thinking")} className="text-xs text-muted-foreground" />
					</div>
				) : null}

				{!isTurnStreaming && (turn.content || turn.usage) ? (
					<MessageFooter className="gap-2 pt-0.5">
						{turn.content ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
								onClick={handleCopy}
							>
								{copied ? <Check className="mr-1 size-3.5" /> : <Copy className="mr-1 size-3.5" />}
								{copied ? t("aiChat.copiedMessage") : t("aiChat.copyMessage")}
							</Button>
						) : null}
						{isLastAssistant && !isStreamingGlobal && onRegenerate ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
								onClick={onRegenerate}
							>
								<RotateCcw className="mr-1 size-3.5" />
								{t("aiChat.regenerate")}
							</Button>
						) : null}
						{turn.usage ? (
							<span className="ml-auto text-[11px] text-muted-foreground/80 tabular-nums">
								{turn.usage.total_tokens} tokens
								{turn.usage.duration_ms ? ` · ${turn.usage.duration_ms}ms` : ""}
							</span>
						) : null}
					</MessageFooter>
				) : null}
			</MessageContent>
		</Message>
	);
}
