import type { AgentApproval } from "@/api/agent";

export interface ChatToolStep {
	id: string;
	toolName: string;
	arguments: string;
	result?: string;
	status: "running" | "done" | "blocked" | "waiting_approval";
}

export interface ChatGuardrailNote {
	id: string;
	text: string;
}

export interface ChatTurn {
	id: string;
	role: "user" | "assistant";
	content: string;
	reasoning: string;
	toolSteps: ChatToolStep[];
	approvals: AgentApproval[];
	guardrailNotes: ChatGuardrailNote[];
	usage?: {
		total_tokens: number;
		duration_ms?: number;
	};
	status?: "streaming" | "waiting_approval" | "done" | "error";
	createdAt: number;
}

export interface ChatSession {
	id: string;
	title: string;
	agentId: number;
	turns: ChatTurn[];
	createdAt: number;
	updatedAt: number;
}
