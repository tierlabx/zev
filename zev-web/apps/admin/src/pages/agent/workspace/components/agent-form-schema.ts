import * as z from "zod";
import type { McpServerConfig } from "@/api/agent";
import type { TranslationKey } from "@/i18n";

export interface EditableMcpServer extends McpServerConfig {
	_uid: string;
}

export function createAgentFormSchema(t: (key: TranslationKey) => string) {
	return z.object({
		name: z.string().min(2, t("agent.workspace.nameRequired")).max(100),
		code: z
			.string()
			.min(2, t("agent.workspace.codeRequired"))
			.max(64)
			.regex(/^[a-zA-Z0-9_-]+$/, t("agent.workspace.codePattern")),
		description: z.string().max(500),
		provider_id: z.number().min(1, t("agent.workspace.providerRequired")),
		model: z.string().max(100),
		system_prompt: z.string(),
		temperature: z.number().min(0).max(2),
		max_steps: z.number().min(1).max(24),
		max_tokens: z.number().min(512).max(200000),
		enable_pii_filter: z.boolean(),
		require_high_risk_review: z.boolean(),
		blocked_keywords_text: z.string(),
		max_input_runes: z.number().min(100).max(64000),
		max_output_runes: z.number().min(200).max(64000),
		status: z.number(),
	});
}

export type AgentFormValues = z.infer<ReturnType<typeof createAgentFormSchema>>;
