import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Textarea } from "@zev/ui/components/textarea";
import { Bot, Eraser, Send, ShieldAlert, Square, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	type AgentApproval,
	type AgentChatMessage,
	cancelAgentRun,
	getAgentOptions,
	getApprovalList,
	type RunStreamEvent,
	streamAgentRun,
} from "@/api/agent";
import { useI18n } from "@/i18n";
import { ApprovalActionCard } from "./components/ApprovalActionCard";
import { type PlaygroundToolStep, ToolCallCard } from "./components/ToolCallCard";

interface GuardrailNote {
	id: string;
	text: string;
}

interface ChatTurn {
	id: string;
	role: "user" | "assistant";
	content: string;
	reasoning: string;
	toolSteps: PlaygroundToolStep[];
	approvals: AgentApproval[];
	guardrailNotes: GuardrailNote[];
	usage?: { total_tokens: number; duration_ms?: number };
	status?: "streaming" | "waiting_approval" | "done" | "error";
}

export default function AgentPlaygroundPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();

	const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
	const [highlightedApprovalId, setHighlightedApprovalId] = useState<number | null>(null);
	const [input, setInput] = useState("");
	const [turns, setTurns] = useState<ChatTurn[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [activeRunId, setActiveRunId] = useState<number | null>(null);

	const abortRef = useRef<AbortController | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const { data: agents = [] } = useQuery({
		queryKey: ["agentOptions"],
		queryFn: getAgentOptions,
	});

	const { data: pendingApprovals } = useQuery({
		queryKey: ["agentPendingApprovals"],
		queryFn: () => getApprovalList({ page: 1, pageSize: 20, status: "pending" }),
		refetchInterval: 8000,
	});

	// 解析 URL 查询参数中的 approvalId 与 agentId（支持从通知中心一键定位）
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const urlApprovalId = Number(params.get("approvalId"));
		if (urlApprovalId > 0) {
			setHighlightedApprovalId(urlApprovalId);
		}
		if (agents.length === 0) return;
		const urlAgentId = Number(params.get("agentId"));
		if (urlAgentId && agents.some((a) => a.id === urlAgentId)) {
			setSelectedAgentId(urlAgentId);
			return;
		}
		if (!selectedAgentId) {
			setSelectedAgentId(agents[0].id);
		}
	}, [agents, selectedAgentId]);

	const scrollToBottom = () => {
		window.requestAnimationFrame(() => {
			if (scrollRef.current) {
				scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			}
		});
	};

	const handleStop = async () => {
		abortRef.current?.abort();
		if (activeRunId) {
			try {
				await cancelAgentRun(activeRunId);
			} catch {
				// 忽略取消时的网络竞态
			}
		}
		setIsStreaming(false);
		setActiveRunId(null);
	};

	const handleSend = async () => {
		const trimmed = input.trim();
		if (!trimmed || isStreaming) return;
		if (!selectedAgentId) {
			toast.error(t("agent.playground.selectAgentFirst"));
			return;
		}

		const history: AgentChatMessage[] = turns
			.filter((turn) => turn.content.trim() !== "")
			.map((turn) => ({
				role: turn.role,
				content: turn.content,
			}));

		const userTurn: ChatTurn = {
			id: `u-${Date.now()}`,
			role: "user",
			content: trimmed,
			reasoning: "",
			toolSteps: [],
			approvals: [],
			guardrailNotes: [],
		};
		const assistantTurnId = `a-${Date.now() + 1}`;
		const assistantTurn: ChatTurn = {
			id: assistantTurnId,
			role: "assistant",
			content: "",
			reasoning: "",
			toolSteps: [],
			approvals: [],
			guardrailNotes: [],
			status: "streaming",
		};

		setTurns((prev) => [...prev, userTurn, assistantTurn]);
		scrollToBottom();
		setInput("");
		setIsStreaming(true);

		const controller = new AbortController();
		abortRef.current = controller;

		const updateAssistant = (updater: (turn: ChatTurn) => ChatTurn) => {
			setTurns((prev) => prev.map((item) => (item.id === assistantTurnId ? updater(item) : item)));
			scrollToBottom();
		};

		const onEvent = (evt: RunStreamEvent) => {
			if (evt.run_id) {
				setActiveRunId(evt.run_id);
			}
			switch (evt.type) {
				case "reasoning":
					updateAssistant((turn) => ({
						...turn,
						reasoning: turn.reasoning + (evt.content ?? ""),
						status: "streaming",
					}));
					break;
				case "token":
					updateAssistant((turn) => ({ ...turn, content: turn.content + (evt.content ?? ""), status: "streaming" }));
					break;
				case "tool_call":
					updateAssistant((turn) => ({
						...turn,
						toolSteps: [
							...turn.toolSteps,
							{
								id: evt.tool_call_id || `${evt.tool_name}-${turn.toolSteps.length}`,
								toolName: evt.tool_name || "tool",
								arguments: evt.arguments || "{}",
								status: "running",
							},
						],
					}));
					break;
				case "tool_result":
					updateAssistant((turn) => {
						const fallbackIdx = turn.toolSteps.findLastIndex(
							(s) => s.toolName === evt.tool_name && s.status === "running",
						);
						return {
							...turn,
							toolSteps: turn.toolSteps.map((s, idx) => {
								const matched = evt.tool_call_id ? s.id === evt.tool_call_id : idx === fallbackIdx;
								return matched ? { ...s, result: evt.result ?? "", status: "done" } : s;
							}),
						};
					});
					break;
				case "guardrail":
					updateAssistant((turn) => ({
						...turn,
						guardrailNotes: evt.reason
							? [...turn.guardrailNotes, { id: `g-${Date.now()}-${turn.guardrailNotes.length}`, text: evt.reason }]
							: turn.guardrailNotes,
						toolSteps: evt.tool_name
							? turn.toolSteps.map((s, idx, arr) => {
									const isLastRunning =
										idx === arr.findLastIndex((x) => x.toolName === evt.tool_name && x.status === "running");
									return isLastRunning ? { ...s, status: "blocked" } : s;
								})
							: turn.toolSteps,
					}));
					break;
				case "approval_required":
					queryClient.invalidateQueries({ queryKey: ["agentPendingApprovals"] });
					updateAssistant((turn) => ({
						...turn,
						status: "waiting_approval",
						approvals: evt.approval ? [...turn.approvals, evt.approval] : turn.approvals,
						toolSteps: turn.toolSteps.map((s) => {
							const matched = evt.tool_call_id
								? s.id === evt.tool_call_id
								: s.toolName === evt.tool_name && s.status === "running";
							return matched ? { ...s, status: "waiting_approval" } : s;
						}),
					}));
					break;
				case "approval_resolved":
					queryClient.invalidateQueries({ queryKey: ["agentPendingApprovals"] });
					updateAssistant((turn) => ({
						...turn,
						status: "streaming",
						approvals: turn.approvals.map((ap) => {
							const matched = evt.approval_id
								? ap.id === evt.approval_id
								: ap.tool_name === evt.tool_name && ap.status === "pending";
							return matched
								? {
										...ap,
										status: (evt.status as AgentApproval["status"]) || ap.status,
										decision_comment: evt.reason || ap.decision_comment,
									}
								: ap;
						}),
						toolSteps: turn.toolSteps.map((s) => {
							const matched = evt.tool_call_id
								? s.id === evt.tool_call_id
								: s.toolName === evt.tool_name && s.status === "waiting_approval";
							if (!matched) return s;
							return { ...s, status: evt.status === "approved" ? "running" : "blocked" };
						}),
					}));
					break;
				case "completed":
					updateAssistant((turn) => ({
						...turn,
						content: evt.content || turn.content,
						status: "done",
						usage: {
							total_tokens: evt.usage?.total_tokens ?? 0,
							duration_ms: evt.duration_ms,
						},
					}));
					queryClient.invalidateQueries({ queryKey: ["agentRuns"] });
					break;
				case "error":
					updateAssistant((turn) => ({
						...turn,
						status: "error",
						guardrailNotes: evt.reason
							? [...turn.guardrailNotes, { id: `e-${Date.now()}-${turn.guardrailNotes.length}`, text: evt.reason }]
							: turn.guardrailNotes,
					}));
					break;
			}
		};

		try {
			await streamAgentRun({ agent_id: selectedAgentId, input: trimmed, history }, onEvent, controller.signal);
		} catch (err) {
			if (err instanceof Error && err.name !== "AbortError") {
				toast.error(err.message);
				updateAssistant((turn) => ({
					...turn,
					status: "error",
					guardrailNotes: [...turn.guardrailNotes, { id: `err-${Date.now()}`, text: err.message }],
				}));
			}
		} finally {
			setIsStreaming(false);
			setActiveRunId(null);
			abortRef.current = null;
			queryClient.invalidateQueries({ queryKey: ["agentPendingApprovals"] });
		}
	};

	const pendingList = pendingApprovals?.list ?? [];

	return (
		<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
			{/* 左侧：智能体切换与待处理审批队列 */}
			<div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 min-h-0">
				<Card className="p-4 space-y-3">
					<div className="text-xs font-medium text-muted-foreground">{t("agent.playground.selectAgent")}</div>
					<Select
						value={selectedAgentId ? String(selectedAgentId) : ""}
						onValueChange={(v) => setSelectedAgentId(Number(v))}
					>
						<SelectTrigger>
							<SelectValue placeholder={t("agent.playground.selectAgent")} />
						</SelectTrigger>
						<SelectContent>
							{agents.map((a) => (
								<SelectItem key={a.id} value={String(a.id)}>
									{a.name} ({a.model})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{agents.find((a) => a.id === selectedAgentId)?.description ? (
						<p className="text-xs text-muted-foreground leading-relaxed">
							{agents.find((a) => a.id === selectedAgentId)?.description}
						</p>
					) : null}
					<Button
						variant="outline"
						size="sm"
						className="w-full"
						disabled={isStreaming || turns.length === 0}
						onClick={() => setTurns([])}
					>
						<Eraser className="mr-1.5 h-3.5 w-3.5" />
						{t("agent.playground.clearChat")}
					</Button>
				</Card>

				<Card className="flex-1 flex flex-col p-4 min-h-0 space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium flex items-center gap-1.5">
							<ShieldAlert className="h-3.5 w-3.5" />
							{t("agent.approval.queueTitle")}
						</span>
						<Badge variant={pendingList.length > 0 ? "destructive" : "secondary"} className="tabular-nums text-[11px]">
							{pendingList.length}
						</Badge>
					</div>
					<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
						{pendingList.length === 0 ? (
							<div className="text-xs text-muted-foreground py-6 text-center">{t("agent.approval.emptyQueue")}</div>
						) : (
							pendingList.map((ap) => (
								<ApprovalActionCard
									key={ap.id}
									approval={ap}
									highlighted={highlightedApprovalId === ap.id}
									onDecided={() => {
										if (highlightedApprovalId === ap.id) {
											setHighlightedApprovalId(null);
										}
										queryClient.invalidateQueries({ queryKey: ["agentPendingApprovals"] });
									}}
								/>
							))
						)}
					</div>
				</Card>
			</div>

			{/* 右侧：SSE 流式对话与工具审批主工作台 */}
			<Card className="lg:col-span-8 xl:col-span-9 flex flex-col p-4 min-h-0">
				<div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
					{turns.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2 py-12">
							<Bot className="h-8 w-8 opacity-40" />
							<p className="text-sm">{t("agent.playground.emptyHint")}</p>
						</div>
					) : (
						turns.map((turn) => (
							<div key={turn.id} className={`flex gap-3 ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
								{turn.role === "assistant" ? (
									<div className="h-7 w-7 rounded-md border bg-muted flex items-center justify-center shrink-0 mt-0.5">
										<Bot className="h-4 w-4" />
									</div>
								) : null}

								<div
									className={`max-w-[85%] space-y-2 ${
										turn.role === "user"
											? "rounded-lg bg-primary text-primary-foreground px-3.5 py-2.5 text-sm"
											: "flex-1 min-w-0"
									}`}
								>
									{turn.role === "user" ? (
										<div className="whitespace-pre-wrap break-words">{turn.content}</div>
									) : (
										<div className="space-y-2.5">
											{turn.reasoning ? (
												<details
													open={turn.status === "streaming" && !turn.content}
													className="rounded-md border bg-muted/30 px-3 py-2 text-xs"
												>
													<summary className="cursor-pointer select-none font-medium text-muted-foreground">
														{turn.status === "streaming" && !turn.content
															? t("agent.playground.reasoningStreaming")
															: t("agent.playground.reasoningTitle")}
													</summary>
													<div className="mt-2 border-t pt-2 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
														{turn.reasoning}
													</div>
												</details>
											) : null}

											{turn.toolSteps.map((step) => (
												<ToolCallCard key={step.id} step={step} />
											))}

											{turn.approvals.map((ap) => (
												<ApprovalActionCard
													key={ap.id}
													approval={ap}
													onDecided={(updated) => {
														setTurns((prev) =>
															prev.map((item) =>
																item.id === turn.id
																	? {
																			...item,
																			approvals: item.approvals.map((a) => (a.id === updated.id ? updated : a)),
																		}
																	: item,
															),
														);
														queryClient.invalidateQueries({ queryKey: ["agentPendingApprovals"] });
													}}
												/>
											))}

											{turn.guardrailNotes.map((note) => (
												<div
													key={note.id}
													className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
												>
													{note.text}
												</div>
											))}

											{turn.content ? (
												<div className="rounded-lg border bg-card px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
													{turn.content}
												</div>
											) : turn.status === "streaming" ? (
												<div className="text-xs text-muted-foreground animate-pulse">
													{t("agent.playground.thinking")}
												</div>
											) : null}

											{turn.usage ? (
												<div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
													<span>Tokens: {turn.usage.total_tokens}</span>
													{turn.usage.duration_ms ? <span>{turn.usage.duration_ms}ms</span> : null}
												</div>
											) : null}
										</div>
									)}
								</div>

								{turn.role === "user" ? (
									<div className="h-7 w-7 rounded-md border bg-muted flex items-center justify-center shrink-0 mt-0.5">
										<User className="h-4 w-4" />
									</div>
								) : null}
							</div>
						))
					)}
				</div>

				<div className="mt-4 pt-3 border-t flex items-end gap-2">
					<Textarea
						rows={2}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder={t("agent.playground.inputPlaceholder")}
						className="min-h-[60px] resize-none"
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								void handleSend();
							}
						}}
					/>
					{isStreaming ? (
						<Button variant="destructive" className="h-10 px-4 shrink-0" onClick={() => void handleStop()}>
							<Square className="mr-1.5 h-3.5 w-3.5" />
							{t("agent.playground.stop")}
						</Button>
					) : (
						<Button
							className="h-10 px-4 shrink-0"
							disabled={!input.trim() || !selectedAgentId}
							onClick={() => void handleSend()}
						>
							<Send className="mr-1.5 h-3.5 w-3.5" />
							{t("agent.playground.send")}
						</Button>
					)}
				</div>
			</Card>
		</div>
	);
}
