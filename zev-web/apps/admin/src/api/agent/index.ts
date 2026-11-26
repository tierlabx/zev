import { clearSessionAndRedirectToLogin } from "@/router/session";
import { useUserStore } from "@/store";
import type {
	AgentListParams,
	AgentListResponse,
	AgentPayload,
	ApprovalListParams,
	ApprovalListResponse,
	EvalCasePayload,
	EvalDatasetListResponse,
	EvalDatasetPayload,
	EvalRunDetailResponse,
	EvalRunListResponse,
	ProviderListParams,
	ProviderListResponse,
	ProviderPayload,
	ProviderPingResponse,
	RunDetailResponse,
	RunListParams,
	RunListResponse,
	RunStreamEvent,
	RunStreamPayload,
} from "../dto/agent";
import type {
	AgentApproval,
	AgentDefinition,
	AgentEvalCase,
	AgentEvalDataset,
	AgentOption,
	AgentProvider,
	AgentProviderOption,
	AgentRunHeartbeat,
	AgentToolMeta,
} from "../interface/agent";
import request from "../request";

export type * from "../dto/agent";
export type * from "../interface/agent";

// --- 模型网关 Provider ---
export const getProviderList = (params: ProviderListParams) =>
	request.get<ProviderListResponse>("/agent/provider/list", { params });

export const getProviderOptions = () => request.get<AgentProviderOption[]>("/agent/provider/options");

export const createProvider = (data: ProviderPayload) => request.post<AgentProvider>("/agent/provider/create", data);

export const updateProvider = (data: ProviderPayload) => request.put<AgentProvider>("/agent/provider/update", data);

export const deleteProvider = (id: number) => request.delete(`/agent/provider/delete/${id}`);

export const pingProvider = (id: number) => request.post<ProviderPingResponse>(`/agent/provider/ping/${id}`);

// --- 智能体编排 Workspace ---
export const getAgentList = (params: AgentListParams) =>
	request.get<AgentListResponse>("/agent/definition/list", { params });

export const getAgentOptions = () => request.get<AgentOption[]>("/agent/definition/options");

export const createAgent = (data: AgentPayload) => request.post<AgentDefinition>("/agent/definition/create", data);

export const updateAgent = (data: AgentPayload) => request.put<AgentDefinition>("/agent/definition/update", data);

export const deleteAgent = (id: number) => request.delete(`/agent/definition/delete/${id}`);

export const getAgentToolCatalog = (agentId?: number) =>
	request.get<{ tools: AgentToolMeta[] }>("/agent/definition/tools", {
		params: agentId ? { agentId } : undefined,
	});

// --- 运行轨迹 Traces & Playground SSE ---
export const getRunList = (params: RunListParams) => request.get<RunListResponse>("/agent/run/list", { params });

export const getRunDetail = (id: number) => request.get<RunDetailResponse>(`/agent/run/detail/${id}`);

export const getRunHeartbeats = () => request.get<AgentRunHeartbeat[]>("/agent/run/heartbeats");

export const cancelAgentRun = (id: number) => request.post(`/agent/run/cancel/${id}`);

function parseAgentSseBlock(block: string): RunStreamEvent | null {
	const lines = block.split(/\r?\n/);
	const dataLines: string[] = [];
	for (const line of lines) {
		if (!line || line.startsWith(":")) continue;
		if (line.startsWith("data:")) {
			dataLines.push(line.slice(5).trimStart());
		}
	}
	if (dataLines.length === 0) return null;
	try {
		return JSON.parse(dataLines.join("\n")) as RunStreamEvent;
	} catch {
		return null;
	}
}

/**
 * 发起 POST SSE 流式智能体调用（携带 Authorization Bearer），实时回调解析后的运行时事件
 */
export async function streamAgentRun(
	payload: RunStreamPayload,
	onEvent: (evt: RunStreamEvent) => void,
	signal?: AbortSignal,
): Promise<void> {
	const token = useUserStore.getState().token;
	const resp = await fetch("/api/agent/run/stream", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "text/event-stream",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(payload),
		signal,
	});

	if (resp.status === 401) {
		clearSessionAndRedirectToLogin();
		throw new Error("登录状态已失效，请重新登录");
	}

	if (!resp.ok) {
		let msg = `HTTP ${resp.status}`;
		try {
			const json = (await resp.json()) as { msg?: string };
			if (json.msg) msg = json.msg;
		} catch {
			// 非 JSON 错误体直接沿用状态码提示
		}
		throw new Error(msg);
	}

	const contentType = resp.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		const json = (await resp.json()) as { code?: number; msg?: string };
		if (json.code === 401) {
			clearSessionAndRedirectToLogin();
		}
		throw new Error(json.msg || "运行失败");
	}

	if (!resp.body) {
		throw new Error("当前浏览器不支持流式响应");
	}

	const reader = resp.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const blocks = buffer.split(/\r?\n\r?\n/);
		buffer = blocks.pop() ?? "";
		for (const block of blocks) {
			const evt = parseAgentSseBlock(block);
			if (evt) {
				onEvent(evt);
			}
		}
	}
	buffer += decoder.decode();
	if (buffer.trim()) {
		const tailEvt = parseAgentSseBlock(buffer);
		if (tailEvt) {
			onEvent(tailEvt);
		}
	}
}

// --- 高危工具人机审批 Approvals ---
export const getApprovalList = (params: ApprovalListParams) =>
	request.get<ApprovalListResponse>("/agent/approval/list", { params });

export const getApprovalPendingCount = () => request.get<{ count: number }>("/agent/approval/pending-count");

export const decideApproval = (id: number, data: { approved: boolean; comment: string }) =>
	request.post<AgentApproval>(`/agent/approval/decide/${id}`, data);

// --- 评测集与回归评测 Evals ---
export const getEvalDatasets = (params: { page: number; pageSize: number; keyword?: string }) =>
	request.get<EvalDatasetListResponse>("/agent/eval/dataset/list", { params });

export const createEvalDataset = (data: EvalDatasetPayload) =>
	request.post<AgentEvalDataset>("/agent/eval/dataset/create", data);

export const updateEvalDataset = (data: EvalDatasetPayload) =>
	request.put<AgentEvalDataset>("/agent/eval/dataset/update", data);

export const deleteEvalDataset = (id: number) => request.delete(`/agent/eval/dataset/delete/${id}`);

export const getEvalCases = (datasetId: number) =>
	request.get<AgentEvalCase[]>("/agent/eval/case/list", { params: { datasetId } });

export const createEvalCase = (data: EvalCasePayload) => request.post<AgentEvalCase>("/agent/eval/case/create", data);

export const updateEvalCase = (data: EvalCasePayload) => request.put<AgentEvalCase>("/agent/eval/case/update", data);

export const deleteEvalCase = (id: number) => request.delete(`/agent/eval/case/delete/${id}`);

export const executeEvalRun = (datasetId: number) =>
	request.post<EvalRunDetailResponse>(`/agent/eval/run/execute/${datasetId}`);

export const getEvalRuns = (params: { page: number; pageSize: number; datasetId?: number }) =>
	request.get<EvalRunListResponse>("/agent/eval/run/list", { params });

export const getEvalRunDetail = (id: number) => request.get<EvalRunDetailResponse>(`/agent/eval/run/detail/${id}`);
