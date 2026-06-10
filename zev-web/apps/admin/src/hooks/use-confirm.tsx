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

export function useConfirm() {
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
						<AlertDialogTitle>确认操作</AlertDialogTitle>
						<AlertDialogDescription>{config?.message}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setIsOpen(false)}>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
								e.preventDefault();
								handleConfirm();
							}}
							className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
						>
							确定
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}, [isOpen, config, handleConfirm]);

	return { confirm, ConfirmDialog };
}
