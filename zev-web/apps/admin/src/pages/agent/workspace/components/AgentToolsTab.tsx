import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Switch } from "@zev/ui/components/switch";
import { Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { AgentToolMeta } from "@/api/agent";
import { useI18n } from "@/i18n";
import type { EditableMcpServer } from "./agent-form-schema";

interface AgentToolsTabProps {
	tools: AgentToolMeta[];
	selectedTools: string[];
	onToggleTool: (name: string) => void;
	mcpServers: EditableMcpServer[];
	setMcpServers: Dispatch<SetStateAction<EditableMcpServer[]>>;
}

export function AgentToolsTab({ tools, selectedTools, onToggleTool, mcpServers, setMcpServers }: AgentToolsTabProps) {
	const { t } = useI18n();

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<div className="text-xs font-medium text-muted-foreground">
					{t("agent.workspace.builtinTools")} ({selectedTools.length})
				</div>
				<div className="space-y-2">
					{tools.map((tool) => {
						const enabled = selectedTools.includes(tool.name);
						return (
							<div key={tool.name} className="flex items-start justify-between gap-3 rounded-md border p-3 text-xs">
								<div className="space-y-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-medium text-foreground">{tool.title}</span>
										<code className="text-[11px] text-muted-foreground">{tool.name}</code>
										<Badge variant={tool.risk_level === "high" ? "destructive" : "outline"} className="text-[10px]">
											{tool.risk_level}
										</Badge>
									</div>
									<p className="text-muted-foreground">{tool.description}</p>
								</div>
								<Switch checked={enabled} onCheckedChange={() => onToggleTool(tool.name)} />
							</div>
						);
					})}
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">MCP Server (JSON-RPC HTTP)</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setMcpServers((prev) => [
								...prev,
								{
									_uid: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
									name: `mcp_${prev.length + 1}`,
									url: "",
									risk_level: "high",
									enabled: true,
								},
							])
						}
					>
						<Plus className="mr-1 h-3.5 w-3.5" />
						{t("agent.workspace.addMcp")}
					</Button>
				</div>
				{mcpServers.map((srv) => (
					<div key={srv._uid} className="grid grid-cols-12 gap-2 items-center rounded-md border p-2">
						<Input
							className="col-span-3 h-8 text-xs"
							placeholder="name"
							value={srv.name}
							onChange={(e) =>
								setMcpServers((prev) =>
									prev.map((item) => (item._uid === srv._uid ? { ...item, name: e.target.value } : item)),
								)
							}
						/>
						<Input
							className="col-span-6 h-8 text-xs font-mono"
							placeholder="http://localhost:9000/mcp"
							value={srv.url}
							onChange={(e) =>
								setMcpServers((prev) =>
									prev.map((item) => (item._uid === srv._uid ? { ...item, url: e.target.value } : item)),
								)
							}
						/>
						<div className="col-span-2 flex justify-center">
							<Switch
								checked={srv.enabled}
								onCheckedChange={(checked) =>
									setMcpServers((prev) =>
										prev.map((item) => (item._uid === srv._uid ? { ...item, enabled: checked } : item)),
									)
								}
							/>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="col-span-1 h-8 w-8 text-destructive"
							onClick={() => setMcpServers((prev) => prev.filter((item) => item._uid !== srv._uid))}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
