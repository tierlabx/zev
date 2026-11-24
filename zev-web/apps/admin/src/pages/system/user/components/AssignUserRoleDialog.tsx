import { useMutation } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@zev/ui/components/dialog";
import { Label } from "@zev/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Role } from "@/api/system/role";
import { assignUserRole } from "@/api/system/user";
import { useI18n } from "@/i18n";

interface AssignUserRoleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: number | null;
	currentRoleId?: number;
	roles: Role[];
	onSuccess: () => void;
}

export function AssignUserRoleDialog({
	open,
	onOpenChange,
	userId,
	currentRoleId,
	roles,
	onSuccess,
}: AssignUserRoleDialogProps) {
	const { t } = useI18n();
	const [selectedRoleId, setSelectedRoleId] = useState<string>("");

	useEffect(() => {
		if (open && currentRoleId) {
			setSelectedRoleId(currentRoleId.toString());
		} else if (open) {
			setSelectedRoleId("");
		}
	}, [open, currentRoleId]);

	const mutation = useMutation({
		mutationFn: (data: { userId: number; roleId: number }) => assignUserRole(data.userId, data.roleId),
		onSuccess: () => {
			toast.success(t("user.assignSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("user.assignFailed"));
		},
	});

	const handleSubmit = () => {
		if (!userId) return;
		if (!selectedRoleId) {
			toast.error(t("user.selectRoleRequired"));
			return;
		}
		mutation.mutate({ userId, roleId: Number(selectedRoleId) });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t("user.assignRole")}</DialogTitle>
				</DialogHeader>

				<div className="py-4 space-y-4">
					<div className="space-y-2">
						<Label>{t("user.selectRoleLabel")}</Label>
						<Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
							<SelectTrigger>
								<SelectValue placeholder={t("user.selectRolePlaceholder")} />
							</SelectTrigger>
							<SelectContent>
								{roles.map((r) => (
									<SelectItem key={r.ID} value={r.ID.toString()}>
										{r.name} ({r.code})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={mutation.isPending || !selectedRoleId}>
						{mutation.isPending ? t("common.submitting") : t("user.confirmAssign")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
