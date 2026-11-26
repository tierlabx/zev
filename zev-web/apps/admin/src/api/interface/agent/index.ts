export type ProviderType = "openai" | "anthropic" | "gemini" | "ollama";

export interface AgentProvider {
	id: number;
	name: string;
	provider_type: ProviderType;
	base_url: string;
	api_key_masked: string;
	has_api_key: boolean;
	default_model: string;
	models: string[];
	timeout_sec: number;
	status: number;
	remark: string;
	created_at: string;
	updated_at: string;
}

export interface AgentProviderOption {
	id: number;
	name: string;
	provider_type: ProviderType;
	default_model: string;
	models: string[];
}

export interface McpServerConfig {
	name: string;
	url: string;
	headers?: Record<string, string>;
	risk_level?: string;
	enabled: boolean;
}

export interface GuardrailPolicy {
	enable_pii_filter: boolean;
	blocked_keywords: string[];
	require_approval_tools: string[];
	require_high_risk_review: boolean;
	max_input_runes: number;
	max_output_runes: number;
}

export interface AgentDefinition {
	id: number;
	name: string;
	code: string;
	description: string;
	provider_id: number;
	provider_name: string;
	model: string;
	system_prompt: string;
	temperature: number;
	max_steps: number;
	max_tokens: number;
	tool_whitelist: string[];
	mcp_servers: McpServerConfig[];
	guardrail_config: GuardrailPolicy;
	status: number;
	created_at: string;
	updated_at: string;
}

export interface AgentOption {
	id: number;
	name: string;
	code: string;
	model: string;
	provider_name: string;
	description: string;
}

export interface AgentToolMeta {
	name: string;
	title: string;
	description: string;
	source: "builtin" | "mcp";
	risk_level: "low" | "medium" | "high" | "critical";
	required_perms?: string[];
	parameters?: Record<string, unknown>;
}

export interface AgentToolCall {
	id: string;
	name: string;
	arguments: string;
}

export interface AgentChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string;
	tool_calls?: AgentToolCall[];
	tool_call_id?: string;
	tool_name?: string;
}

export interface AgentRun {
	id: number;
	agent_id: number;
	agent_name: string;
	provider_id: number;
	model: string;
	status: "running" | "waiting_approval" | "completed" | "failed" | "cancelled";
	input_summary: string;
	output_summary: string;
	step_count: number;
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	duration_ms: number;
	error_message: string;
	created_by: number;
	created_at: string;
}

export interface AgentRunSpan {
	id: number;
	run_id: number;
	parent_span_id: number;
	span_type: "llm" | "tool" | "guardrail" | "approval" | "system";
	name: string;
	status: "running" | "ok" | "error" | "blocked" | "waiting";
	input_json: string;
	output_json: string;
	tokens: number;
	started_at: string;
	ended_at?: string;
	duration_ms: number;
	error_message: string;
}

export interface AgentRunHeartbeat {
	run_id: number;
	status: AgentRun["status"];
	agent_name: string;
	duration_ms: number;
	created_at: string;
}

export interface AgentApproval {
	id: number;
	run_id: number;
	agent_id: number;
	agent_name: string;
	tool_name: string;
	tool_args_json: string;
	risk_level: string;
	reason: string;
	status: "pending" | "approved" | "rejected" | "expired";
	requester_id: number;
	requester_name: string;
	approver_id: number;
	approver_name: string;
	decision_comment: string;
	decided_at?: string;
	expires_at: string;
	created_at: string;
}

export interface AgentEvalDataset {
	id: number;
	name: string;
	description: string;
	agent_id: number;
	agent_name: string;
	pass_threshold: number;
	case_count: number;
	latest_pass_rate?: number | null;
	pass_rate_delta?: number | null;
	latest_gate_pass?: boolean | null;
	created_at: string;
	updated_at: string;
}

export interface AgentEvalCase {
	id: number;
	dataset_id: number;
	name: string;
	input: string;
	expected_pattern: string;
	expected_json_schema: string;
	judge_criteria: string;
	tags: string;
	sort: number;
	created_at: string;
}

export interface AgentEvalRun {
	id: number;
	dataset_id: number;
	agent_id: number;
	agent_name: string;
	status: "running" | "completed" | "failed";
	total_cases: number;
	passed_cases: number;
	failed_cases: number;
	pass_rate: number;
	gate_passed: boolean;
	avg_latency_ms: number;
	total_tokens: number;
	completed_at?: string;
	created_at: string;
}

export interface AgentEvalCaseResult {
	id: number;
	eval_run_id: number;
	case_id: number;
	case_name: string;
	run_id: number;
	passed: boolean;
	score: number;
	actual_output: string;
	assertion_detail: string;
	judge_reason: string;
	latency_ms: number;
	tokens: number;
}
