import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
	InputGroupTextarea,
} from "@zev/ui/components/input-group";
import { ArrowUp, Square } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useI18n } from "@/i18n";

interface ChatPromptComposerProps {
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	onStop: () => void;
	isStreaming: boolean;
	canSend: boolean;
	modelLabel?: string;
}

export function ChatPromptComposer({
	value,
	onChange,
	onSend,
	onStop,
	isStreaming,
	canSend,
	modelLabel,
}: ChatPromptComposerProps) {
	const { t } = useI18n();

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
			event.preventDefault();
			if (!isStreaming && canSend) {
				onSend();
			}
		}
	};

	return (
		<div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2 shrink-0">
			<InputGroup className="rounded-xl bg-background shadow-xs">
				<InputGroupTextarea
					rows={2}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={t("aiChat.inputPlaceholder")}
					className="min-h-[56px] max-h-40 px-3.5 pt-3 pb-1 text-sm"
				/>
				<InputGroupAddon align="block-end" className="justify-between px-3 pb-2.5 pt-1">
					<InputGroupText className="text-xs text-muted-foreground">
						{modelLabel ? <span className="font-mono text-[11px]">{modelLabel}</span> : t("aiChat.inputHint")}
					</InputGroupText>

					{isStreaming ? (
						<InputGroupButton
							type="button"
							variant="destructive"
							size="sm"
							onClick={onStop}
							aria-label={t("aiChat.stop")}
							className="h-8 px-2.5 text-xs"
						>
							<Square className="size-3.5" />
							<span>{t("aiChat.stop")}</span>
						</InputGroupButton>
					) : (
						<InputGroupButton
							type="button"
							variant="default"
							size="icon-sm"
							disabled={!canSend}
							onClick={onSend}
							aria-label={t("aiChat.send")}
							title={t("aiChat.send")}
							className="rounded-lg"
						>
							<ArrowUp className="size-4" />
						</InputGroupButton>
					)}
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}
