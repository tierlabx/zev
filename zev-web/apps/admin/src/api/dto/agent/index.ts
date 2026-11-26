import type {
	AgentApproval,
	AgentChatMessage,
	AgentDefinition,
	AgentEvalCaseResult,
	AgentEvalDataset,
	AgentEvalRun,
	AgentProvider,
	AgentRun,
	AgentRunSpan,
	GuardrailPolicy,
	McpServerConfig,
	ProviderType,
} from "../../interface/agent";

export interface PageResult<T> {
	list: T[];
	total: number;
}

export interface ProviderListParams {
	page: number;
	pageSize: number;
	keyword?: string;
	providerType?: string;
	status?: string;
}

export interface ProviderPayload {
	id?: number;
	name: string;
	provider_type: ProviderType;
	base_url: string;
	api_key?: string;
	default_model: string;
	models: string[];
	timeout_sec: number;
	status: number;
	remark: string;
}

export interface ProviderPingResponse {
	reachable: boolean;
	latency_ms: number;
	message: string;
}

export interface AgentListParams {
	page: number;
	pageSize: number;
	keyword?: string;
	status?: string;
}

export interface AgentPayload {
	id?: number;
	name: string;
	code: string;
	description: string;
	provider_id: number;
	model: string;
	system_prompt: string;
	temperature: number;
	max_steps: number;
	max_tokens: number;
	tool_whitelist: string[];
	mcp_servers: McpServerConfig[];
	guardrail_config: GuardrailPolicy;
	status: number;
}

export interface RunStreamPayload {
	agent_id: number;
	input: string;
	history?: AgentChatMessage[];
}

export interface RunStreamUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

export interface RunStreamEvent {
	type:
		| "run_started"
		| "step_started"
		| "reasoning"
		| "token"
		| "tool_call"
		| "tool_result"
		| "guardrail"
		| "approval_required"
		| "approval_resolved"
		| "completed"
		| "error";
	run_id?: number;
	step?: number;
	content?: string;
	tool_name?: string;
	tool_call_id?: string;
	arguments?: string;
	result?: string;
	status?: string;
	reason?: string;
	approval_id?: number;
	approval?: AgentApproval;
	usage?: RunStreamUsage;
	duration_ms?: number;
	timestamp?: string;
}

export interface RunListParams {
	page: number;
	pageSize: number;
	agentId?: number;
	status?: string;
	keyword?: string;
}

export interface RunDetailResponse {
	run: AgentRun;
	messages: AgentChatMessage[];
	spans: AgentRunSpan[];
}

export interface ApprovalListParams {
	page: number;
	pageSize: number;
	status?: string;
	runId?: number;
}

export interface EvalDatasetPayload {
	id?: number;
	name: string;
	description: string;
	agent_id: number;
	pass_threshold: number;
}

export interface EvalCasePayload {
	id?: number;
	dataset_id: number;
	name: string;
	input: string;
	expected_pattern: string;
	expected_json_schema: string;
	judge_criteria: string;
	tags: string;
	sort: number;
}

export interface EvalRunDetailResponse {
	run: AgentEvalRun;
	results: AgentEvalCaseResult[];
}

export type ProviderListResponse = PageResult<AgentProvider>;
export type AgentListResponse = PageResult<AgentDefinition>;
export type RunListResponse = PageResult<AgentRun>;
export type ApprovalListResponse = PageResult<AgentApproval>;
export type EvalDatasetListResponse = PageResult<AgentEvalDataset>;
export type EvalRunListResponse = PageResult<AgentEvalRun>;
