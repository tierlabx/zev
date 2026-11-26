import { Badge } from "@zev/ui/components/badge";
import { useI18n } from "@/i18n";

export function NoticeTypeBadge({ type }: { type: number }) {
	const { t } = useI18n();
	const label = type === 2 ? t("notice.typeReminder") : type === 3 ? t("notice.typePrivate") : t("notice.typeSystem");
	return (
		<Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
			{label}
		</Badge>
	);
}

export function NoticeLevelBadge({ level }: { level: number }) {
	const { t } = useI18n();
	if (level >= 2) {
		return <Badge variant="destructive">{t("notice.levelUrgent")}</Badge>;
	}
	if (level === 1) {
		return (
			<Badge variant="outline" className="border-foreground/40 text-foreground">
				{t("notice.levelImportant")}
			</Badge>
		);
	}
	return null;
}
