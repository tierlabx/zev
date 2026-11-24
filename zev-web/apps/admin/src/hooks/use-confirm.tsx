import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@zev/ui/components/alert-dialog";
import { useCallback, useState } from "react";
import { useI18n } from "@/i18n";

export function useConfirm() {
	const { t } = useI18n();
	const [isOpen, setIsOpen] = useState(false);
	const [config, setConfig] = useState<{ message: string; onConfirm: () => void } | null>(null);

	const confirm = useCallback((message: string, onConfirm: () => void) => {
		setConfig({ message, onConfirm });
		setIsOpen(true);
	}, []);

	const handleConfirm = useCallback(() => {
		if (config) {
			config.onConfirm();
		}
		setIsOpen(false);
	}, [config]);

	const ConfirmDialog = useCallback(() => {
		return (
			<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("common.confirmAction")}</AlertDialogTitle>
						<AlertDialogDescription>{config?.message}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setIsOpen(false)}>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
								e.preventDefault();
								handleConfirm();
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
						>
							{t("common.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}, [isOpen, config, handleConfirm, t]);

	return { confirm, ConfirmDialog };
}
