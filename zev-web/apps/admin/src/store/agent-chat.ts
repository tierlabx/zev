import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatSession, ChatTurn } from "@/pages/ai-chat/types";

const MAX_PERSISTED_SESSIONS = 30;
const MAX_SESSION_TITLE_LENGTH = 28;

interface AgentChatState {
	sessions: ChatSession[];
	activeSessionId: string | null;
	selectedAgentId: number;
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
	setSelectedAgentId: (agentId: number) => void;
	createSession: (agentId?: number) => string;
	selectSession: (sessionId: string) => void;
	deleteSession: (sessionId: string) => void;
	updateSessionAgent: (sessionId: string, agentId: number) => void;
	appendTurns: (sessionId: string, turns: ChatTurn[], firstUserText?: string) => void;
	updateTurn: (sessionId: string, turnId: string, updater: (turn: ChatTurn) => ChatTurn) => void;
	truncateTurnsFrom: (sessionId: string, turnId: string) => void;
}

function buildSessionTitle(text: string): string {
	const cleaned = text.replace(/\s+/g, " ").trim();
	if (!cleaned) return "";
	return cleaned.length > MAX_SESSION_TITLE_LENGTH ? `${cleaned.slice(0, MAX_SESSION_TITLE_LENGTH)}...` : cleaned;
}

function generateSessionId(): string {
	return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAgentChatStore = create<AgentChatState>()(
	persist(
		(set, get) => ({
			sessions: [],
			activeSessionId: null,
			selectedAgentId: 0,
			sidebarOpen: true,
			setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
			setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
			createSession: (agentId) => {
				const id = generateSessionId();
				const now = Date.now();
				const targetAgentId = agentId ?? get().selectedAgentId;
				const nextSession: ChatSession = {
					id,
					title: "",
					agentId: targetAgentId,
					turns: [],
					createdAt: now,
					updatedAt: now,
				};
				set((state) => ({
					sessions: [nextSession, ...state.sessions].slice(0, MAX_PERSISTED_SESSIONS),
					activeSessionId: id,
					selectedAgentId: targetAgentId || state.selectedAgentId,
				}));
				return id;
			},
			selectSession: (sessionId) => {
				const target = get().sessions.find((s) => s.id === sessionId);
				set((state) => ({
					activeSessionId: sessionId,
					selectedAgentId: target?.agentId || state.selectedAgentId,
				}));
			},
			deleteSession: (sessionId) => {
				set((state) => {
					const remaining = state.sessions.filter((s) => s.id !== sessionId);
					const nextActive = state.activeSessionId === sessionId ? (remaining[0]?.id ?? null) : state.activeSessionId;
					const nextTarget = remaining.find((s) => s.id === nextActive);
					return {
						sessions: remaining,
						activeSessionId: nextActive,
						selectedAgentId: nextTarget?.agentId || state.selectedAgentId,
					};
				});
			},
			updateSessionAgent: (sessionId, agentId) => {
				set((state) => ({
					selectedAgentId: agentId,
					sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, agentId } : s)),
				}));
			},
			appendTurns: (sessionId, turns, firstUserText) => {
				const now = Date.now();
				set((state) => {
					const updated = state.sessions.map((session) => {
						if (session.id !== sessionId) return session;
						const nextTitle = session.title || (firstUserText ? buildSessionTitle(firstUserText) : session.title);
						return {
							...session,
							title: nextTitle,
							turns: [...session.turns, ...turns],
							updatedAt: now,
						};
					});
					// 最近活跃会话置顶
					const target = updated.find((s) => s.id === sessionId);
					const others = updated.filter((s) => s.id !== sessionId);
					return {
						sessions: target ? [target, ...others].slice(0, MAX_PERSISTED_SESSIONS) : updated,
					};
				});
			},
			updateTurn: (sessionId, turnId, updater) => {
				set((state) => ({
					sessions: state.sessions.map((session) =>
						session.id === sessionId
							? {
									...session,
									updatedAt: Date.now(),
									turns: session.turns.map((turn) => (turn.id === turnId ? updater(turn) : turn)),
								}
							: session,
					),
				}));
			},
			truncateTurnsFrom: (sessionId, turnId) => {
				set((state) => ({
					sessions: state.sessions.map((session) => {
						if (session.id !== sessionId) return session;
						const idx = session.turns.findIndex((t) => t.id === turnId);
						if (idx < 0) return session;
						return {
							...session,
							turns: session.turns.slice(0, idx),
							updatedAt: Date.now(),
						};
					}),
				}));
			},
		}),
		{
			name: "agent-chat-store",
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				// 页面刷新后将未正常收尾的流式状态收敛为已完成，避免卡在加载态
				state.sessions = state.sessions.map((session) => ({
					...session,
					turns: session.turns.map((turn) => (turn.status === "streaming" ? { ...turn, status: "done" } : turn)),
				}));
			},
		},
	),
);
