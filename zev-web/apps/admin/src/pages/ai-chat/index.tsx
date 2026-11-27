import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@zev/ui/components/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@zev/ui/components/empty";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@zev/ui/components/message-scroller";
import { Bot, ChevronDown, PanelLeft, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	type AgentApproval,
	type AgentChatMessage,
	cancelAgentRun,
	getAgentOptions,
	type RunStreamEvent,
	streamAgentRun,
} from "@/api/agent";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";
import { useAgentChatStore } from "@/store/agent-chat";
import { getAvatarInitials } from "@/utils/avatar";
import { ChatMessageRow } from "./components/ChatMessageRow";
import { ChatPromptComposer } from "./components/ChatPromptComposer";
import { ChatSessionSidebar } from "./components/ChatSessionSidebar";
import type { ChatSession, ChatTurn } from "./types";

export default function AiChatPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();
	const userInfo = useUserStore((state) => state.userInfo);

	const {
		sessions,
		activeSessionId,
		selectedAgentId,
		sidebarOpen,
		setSidebarOpen,
		setSelectedAgentId,
		createSession,
		selectSession,
		deleteSession,
		updateSessionAgent,
		appendTurns,
		updateTurn,
		truncateTurnsFrom,
	} = useAgentChatStore();

	const [input, setInput] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const [activeRunId, setActiveRunId] = useState<number | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const { data: agents = [] } = useQuery({
		queryKey: ["agentOptions"],
		queryFn: getAgentOptions,
	});

	// 自动初始化有效智能体（优先沿用当前会话绑定智能体，否则回退首个可用智能体）
	useEffect(() => {
		if (agents.length === 0) return;
		if (!selectedAgentId || !agents.some((a) => a.id === selectedAgentId)) {
			setSelectedAgentId(agents[0].id);
		}
	}, [agents, selectedAgentId, setSelectedAgentId]);

	const activeSession = useMemo(
		() => sessions.find((s) => s.id === activeSessionId) ?? null,
		[sessions, activeSessionId],
	);

	const effectiveAgentId =
		activeSession?.agentId && agents.some((a) => a.id === activeSession.agentId)
			? activeSession.agentId
			: selectedAgentId;

	const currentAgent = useMemo(
		() => agents.find((a) => a.id === effectiveAgentId) ?? agents[0] ?? null,
		[agents, effectiveAgentId],
	);

	const turns = activeSession?.turns ?? [];
	const userInitials = getAvatarInitials(userInfo?.nickname || userInfo?.username || "U");

	const handleSelectAgent = (nextIdStr: string) => {
		const nextId = Number(nextIdStr);
		if (!nextId) return;
		if (activeSession) {
			updateSessionAgent(activeSession.id, nextId);
		} else {
			setSelectedAgentId(nextId);
		}
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

	const runStreamForPrompt = async (
		sessionId: string,
		promptText: string,
		history: AgentChatMessage[],
		agentId: number,
	) => {
		const userTurn: ChatTurn = {
			id: `u-${Date.now()}`,
			role: "user",
			content: promptText,
			reasoning: "",
			toolSteps: [],
			approvals: [],
			guardrailNotes: [],
			createdAt: Date.now(),
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
			createdAt: Date.now() + 1,
		};

		appendTurns(sessionId, [userTurn, assistantTurn], promptText);
		setIsStreaming(true);

		const controller = new AbortController();
		abortRef.current = controller;

		const mutateAssistant = (updater: (turn: ChatTurn) => ChatTurn) => {
			updateTurn(sessionId, assistantTurnId, updater);
		};

		const onEvent = (evt: RunStreamEvent) => {
			if (evt.run_id) {
				setActiveRunId(evt.run_id);
			}
			switch (evt.type) {
				case "reasoning":
					mutateAssistant((turn) => ({
						...turn,
						reasoning: turn.reasoning + (evt.content ?? ""),
						status: "streaming",
					}));
					break;
				case "token":
					mutateAssistant((turn) => ({
						...turn,
						content: turn.content + (evt.content ?? ""),
						status: "streaming",
					}));
					break;
				case "tool_call":
					mutateAssistant((turn) => ({
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
					mutateAssistant((turn) => {
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
					mutateAssistant((turn) => ({
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
					mutateAssistant((turn) => ({
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
					mutateAssistant((turn) => ({
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
					mutateAssistant((turn) => ({
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
					mutateAssistant((turn) => ({
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
			await streamAgentRun({ agent_id: agentId, input: promptText, history }, onEvent, controller.signal);
			// 若服务端流正常结束但未显式派发 completed 事件，保证状态收敛
			mutateAssistant((turn) => (turn.status === "streaming" ? { ...turn, status: "done" } : turn));
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") {
				mutateAssistant((turn) => (turn.status === "streaming" ? { ...turn, status: "done" } : turn));
			} else if (err instanceof Error) {
				toast.error(err.message);
				mutateAssistant((turn) => ({
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

	const handleSendText = async (rawText: string) => {
		const trimmed = rawText.trim();
		if (!trimmed || isStreaming) return;
		if (!currentAgent) {
			toast.error(t("aiChat.noAgentsAvailable"));
			return;
		}

		const targetSessionId = activeSession?.id ?? createSession(currentAgent.id);
		const history: AgentChatMessage[] = (activeSession?.turns ?? [])
			.filter((turn) => turn.content.trim() !== "")
			.map((turn) => ({ role: turn.role, content: turn.content }));

		if (rawText === input) {
			setInput("");
		}
		await runStreamForPrompt(targetSessionId, trimmed, history, currentAgent.id);
	};

	const handleRegenerate = async () => {
		if (!activeSession || !currentAgent || isStreaming) return;
		const lastUserIdx = activeSession.turns.findLastIndex((turn) => turn.role === "user");
		if (lastUserIdx < 0) return;

		const lastUserTurn = activeSession.turns[lastUserIdx];
		const history: AgentChatMessage[] = activeSession.turns
			.slice(0, lastUserIdx)
			.filter((turn) => turn.content.trim() !== "")
			.map((turn) => ({ role: turn.role, content: turn.content }));

		truncateTurnsFrom(activeSession.id, lastUserTurn.id);
		await runStreamForPrompt(activeSession.id, lastUserTurn.content, history, currentAgent.id);
	};

	const handleDeleteSession = (session: ChatSession) => {
		const title = session.title || t("aiChat.untitledChat");
		confirm(t("aiChat.deleteSessionConfirm", { title }), () => {
			deleteSession(session.id);
		});
	};

	const handleApprovalDecided = (turnId: string, updated: AgentApproval) => {
		if (!activeSession) return;
		updateTurn(activeSession.id, turnId, (item) => ({
			...item,
			approvals: item.approvals.map((a) => (a.id === updated.id ? updated : a)),
		}));
		queryClient.invalidateQueries({ queryKey: ["agentPendingApprovals"] });
	};

	const lastAssistantId = useMemo(() => {
		const idx = turns.findLastIndex((turn) => turn.role === "assistant");
		return idx >= 0 ? turns[idx].id : null;
	}, [turns]);

	const suggestions = [t("aiChat.suggestion1"), t("aiChat.suggestion2"), t("aiChat.suggestion3")];

	return (
		<div className="flex-1 flex min-h-0 min-w-0 rounded-md border border-border bg-card overflow-hidden">
			<ChatSessionSidebar
				open={sidebarOpen}
				sessions={sessions}
				activeSessionId={activeSessionId}
				disabled={isStreaming}
				onCreateSession={() => createSession(currentAgent?.id)}
				onSelectSession={selectSession}
				onDeleteSession={handleDeleteSession}
			/>

			<div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
				{/* 顶部轻量控制条：侧栏折叠、智能体选择器与新建对话 */}
				<div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
					<div className="flex items-center gap-2 min-w-0">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="hidden md:inline-flex size-8"
							onClick={() => setSidebarOpen(!sidebarOpen)}
							aria-label={t("aiChat.toggleSidebar")}
							title={t("aiChat.toggleSidebar")}
						>
							<PanelLeft className="size-4" />
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={isStreaming || agents.length === 0}
									className="h-8 gap-1.5 shadow-none max-w-[260px]"
								>
									<Bot className="size-3.5 shrink-0 text-muted-foreground" />
									<span className="truncate font-medium">
										{currentAgent ? currentAgent.name : t("aiChat.selectAgent")}
									</span>
									{currentAgent ? (
										<Badge
											variant="secondary"
											className="hidden sm:inline-flex rounded-sm px-1.5 text-[10px] font-mono"
										>
											{currentAgent.model}
										</Badge>
									) : null}
									<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-64">
								<DropdownMenuLabel>{t("aiChat.selectAgent")}</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuRadioGroup
									value={currentAgent ? String(currentAgent.id) : ""}
									onValueChange={handleSelectAgent}
								>
									{agents.map((agent) => (
										<DropdownMenuRadioItem key={agent.id} value={String(agent.id)} className="cursor-pointer">
											<div className="flex flex-col min-w-0">
												<span className="text-sm font-medium truncate">{agent.name}</span>
												<span className="text-[11px] font-mono text-muted-foreground truncate">
													{agent.provider_name} · {agent.model}
												</span>
											</div>
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 gap-1.5"
						disabled={isStreaming}
						onClick={() => createSession(currentAgent?.id)}
					>
						<Plus className="size-3.5" />
						<span className="hidden sm:inline">{t("aiChat.newChat")}</span>
					</Button>
				</div>

				{/* 中间消息流容器：由 shadcn MessageScroller 统一托管自动跟随与回底 */}
				<MessageScrollerProvider autoScroll>
					<MessageScroller className="flex-1 min-h-0">
						<MessageScrollerViewport>
							<MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
								{turns.length === 0 ? (
									<div className="flex flex-1 flex-col items-center justify-center py-12">
										<Empty className="border-none p-4 max-w-lg">
											<EmptyHeader>
												<EmptyMedia variant="icon">
													<Sparkles />
												</EmptyMedia>
												<EmptyTitle>{t("aiChat.emptyTitle")}</EmptyTitle>
												<EmptyDescription>
													{agents.length === 0
														? t("aiChat.noAgentsAvailable")
														: currentAgent?.description || t("aiChat.emptySubtitle")}
												</EmptyDescription>
											</EmptyHeader>
											{agents.length > 0 ? (
												<div className="flex flex-wrap items-center justify-center gap-2 pt-2">
													{suggestions.map((text) => (
														<Button
															key={text}
															type="button"
															variant="outline"
															size="sm"
															className="h-auto py-1.5 px-3 text-xs font-normal text-muted-foreground hover:text-foreground whitespace-normal text-left"
															onClick={() => void handleSendText(text)}
														>
															{text}
														</Button>
													))}
												</div>
											) : null}
										</Empty>
									</div>
								) : (
									turns.map((turn) => (
										<MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor={turn.role === "user"}>
											<ChatMessageRow
												turn={turn}
												isLastAssistant={turn.id === lastAssistantId}
												isStreamingGlobal={isStreaming}
												userInitials={userInitials}
												onRegenerate={turn.id === lastAssistantId ? () => void handleRegenerate() : undefined}
												onApprovalDecided={handleApprovalDecided}
											/>
										</MessageScrollerItem>
									))
								)}
							</MessageScrollerContent>
						</MessageScrollerViewport>
						<MessageScrollerButton aria-label={t("aiChat.scrollToBottom")} />
					</MessageScroller>
				</MessageScrollerProvider>

				<ChatPromptComposer
					value={input}
					onChange={setInput}
					onSend={() => void handleSendText(input)}
					onStop={() => void handleStop()}
					isStreaming={isStreaming}
					canSend={Boolean(input.trim()) && Boolean(currentAgent)}
					modelLabel={currentAgent ? `${currentAgent.name} · ${currentAgent.model}` : undefined}
				/>
			</div>

			<ConfirmDialog />
		</div>
	);
}
