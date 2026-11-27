import { Button } from "@zev/ui/components/button";
import { Separator } from "@zev/ui/components/separator";
import { cn } from "@zev/ui/lib/utils";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n";
import type { ChatSession } from "../types";

interface ChatSessionSidebarProps {
	open: boolean;
	sessions: ChatSession[];
	activeSessionId: string | null;
	disabled: boolean;
	onCreateSession: () => void;
	onSelectSession: (sessionId: string) => void;
	onDeleteSession: (session: ChatSession) => void;
}

export function ChatSessionSidebar({
	open,
	sessions,
	activeSessionId,
	disabled,
	onCreateSession,
	onSelectSession,
	onDeleteSession,
}: ChatSessionSidebarProps) {
	const { t } = useI18n();

	if (!open) {
		return null;
	}

	return (
		<aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar/40 min-h-0">
			<div className="p-3 shrink-0">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 w-full justify-start gap-2 shadow-none"
					disabled={disabled}
					onClick={onCreateSession}
				>
					<Plus className="size-4" />
					<span>{t("aiChat.newChat")}</span>
				</Button>
			</div>

			<Separator />

			<div className="px-3 py-2 text-xs font-medium text-muted-foreground shrink-0">{t("aiChat.historyTitle")}</div>

			<div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 min-h-0">
				{sessions.length === 0 ? (
					<div className="px-2 py-8 text-center text-xs text-muted-foreground">{t("aiChat.noSessions")}</div>
				) : (
					sessions.map((session) => {
						const isActive = session.id === activeSessionId;
						const label = session.title || t("aiChat.untitledChat");
						return (
							<div
								key={session.id}
								className={cn(
									"group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
									isActive
										? "bg-accent text-accent-foreground font-medium"
										: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
								)}
							>
								<button
									type="button"
									disabled={disabled}
									onClick={() => onSelectSession(session.id)}
									className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer disabled:cursor-not-allowed"
									title={label}
								>
									<MessageSquare className="size-3.5 shrink-0" />
									<span className="truncate text-xs">{label}</span>
								</button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									disabled={disabled}
									onClick={() => onDeleteSession(session)}
									aria-label={t("common.delete")}
									className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive"
								>
									<Trash2 className="size-3.5" />
								</Button>
							</div>
						);
					})
				)}
			</div>
		</aside>
	);
}
