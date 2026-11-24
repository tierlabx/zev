import { useMutation } from "@tanstack/react-query";
import { Button } from "@zev/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@zev/ui/components/dialog";
import { Label } from "@zev/ui/components/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Role } from "@/api/system/role";
import { assignUserRoles } from "@/api/system/user";
import { Checkbox } from "@/components/zev-table/checkbox";
import { usePermission } from "@/hooks/use-permission";
import { useI18n } from "@/i18n";

interface AssignUserRoleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: number | null;
	currentRoleIds?: number[];
	roles: Role[];
	onSuccess: () => void;
}

export function AssignUserRoleDialog({
	open,
	onOpenChange,
	userId,
	currentRoleIds = [],
	roles,
	onSuccess,
}: AssignUserRoleDialogProps) {
	const { t } = useI18n();
	const { isSuperAdmin } = usePermission();
	const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

	const currentRoleKey = currentRoleIds.join(",");

	useEffect(() => {
		if (open) {
			setSelectedRoleIds(currentRoleKey ? currentRoleKey.split(",").map(Number) : []);
		} else {
			setSelectedRoleIds([]);
		}
	}, [open, currentRoleKey]);

	const mutation = useMutation({
		mutationFn: (data: { userId: number; roleIds: number[] }) => assignUserRoles(data.userId, data.roleIds),
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
		if (selectedRoleIds.length === 0) {
			toast.error(t("user.selectRoleRequired"));
			return;
		}
		mutation.mutate({ userId, roleIds: selectedRoleIds });
	};

	const toggleRole = (roleId: number, checked: boolean) => {
		setSelectedRoleIds((prev) => {
			if (checked) {
				return prev.includes(roleId) ? prev : [...prev, roleId];
			}
			return prev.filter((id) => id !== roleId);
		});
	};

	const selectableRoles = roles.filter((r) => isSuperAdmin || (r.ID !== 1 && r.code !== "admin"));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle>{t("user.assignRole")}</DialogTitle>
				</DialogHeader>

				<div className="py-3 space-y-3">
					<Label>{t("user.selectRoleLabel")}</Label>
					<div className="space-y-1.5 rounded-md border border-border p-3 bg-muted/30 max-h-60 overflow-y-auto">
						{selectableRoles.map((r) => {
							const isLockedAdmin = userId === 1 && (r.ID === 1 || r.code === "admin");
							const checkboxId = `assign-role-${r.ID}`;
							return (
								<div
									key={r.ID}
									className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/70"
								>
									<span className="flex items-center gap-2.5 min-w-0 flex-1">
										<Checkbox
											id={checkboxId}
											checked={selectedRoleIds.includes(r.ID)}
											disabled={isLockedAdmin}
											onCheckedChange={(val) => toggleRole(r.ID, val === true)}
										/>
										<label htmlFor={checkboxId} className="truncate font-medium cursor-pointer select-none flex-1">
											{r.name}
										</label>
									</span>
									<span className="text-xs font-mono text-muted-foreground shrink-0">{r.code}</span>
								</div>
							);
						})}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={mutation.isPending || selectedRoleIds.length === 0}>
						{mutation.isPending ? t("common.submitting") : t("user.confirmAssign")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
