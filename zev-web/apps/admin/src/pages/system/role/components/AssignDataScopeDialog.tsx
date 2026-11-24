import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Label } from "@zev/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDeptOptionsTree } from "@/api/system/dept";
import { assignRoleDataScope, type DataScopeValue, getRoleDataScope, type Role } from "@/api/system/role";
import { DeptCheckboxTree } from "@/components/dept-tree-select";
import { usePermission } from "@/hooks/use-permission";
import { useI18n } from "@/i18n";
import { DATA_SCOPE_OPTIONS, getDataScopeMeta } from "@/utils/data-scope";

interface AssignDataScopeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role: Role | null;
	onSuccess: () => void;
}

export function AssignDataScopeDialog({ open, onOpenChange, role, onSuccess }: AssignDataScopeDialogProps) {
	const { t } = useI18n();
	const { hasAllDataScope } = usePermission();
	const [dataScope, setDataScope] = useState<DataScopeValue>(5);
	const [deptIds, setDeptIds] = useState<number[]>([]);

	const { data: roleScope, isLoading: isScopeLoading } = useQuery({
		queryKey: ["roleDataScope", role?.ID],
		queryFn: () => getRoleDataScope(role?.ID as number),
		enabled: open && role !== null,
	});

	const { data: deptOptions = [], isLoading: isDeptLoading } = useQuery({
		queryKey: ["deptOptions"],
		queryFn: getDeptOptionsTree,
		enabled: open && dataScope === 2,
	});

	useEffect(() => {
		if (!open) return;
		if (roleScope) {
			const normalized =
				roleScope.data_scope >= 1 && roleScope.data_scope <= 5 ? (roleScope.data_scope as DataScopeValue) : 5;
			setDataScope(normalized);
			setDeptIds(roleScope.dept_ids ?? []);
		} else if (role) {
			const fallback = role.data_scope >= 1 && role.data_scope <= 5 ? (role.data_scope as DataScopeValue) : 5;
			setDataScope(fallback);
			setDeptIds([]);
		}
	}, [open, roleScope, role]);

	const mutation = useMutation({
		mutationFn: (payload: { data_scope: DataScopeValue; dept_ids: number[] }) =>
			assignRoleDataScope(role?.ID as number, payload),
		onSuccess: () => {
			toast.success(t("role.assignDataScopeSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("role.assignDataScopeFailed"));
		},
	});

	const handleSubmit = () => {
		if (!role) return;
		if (dataScope === 2 && deptIds.length === 0) {
			toast.error(t("dataScope.customDeptRequired"));
			return;
		}
		mutation.mutate({
			data_scope: dataScope,
			dept_ids: dataScope === 2 ? deptIds : [],
		});
	};

	const activeMeta = getDataScopeMeta(dataScope);
	const selectableOptions = DATA_SCOPE_OPTIONS.filter((opt) => hasAllDataScope || opt.value !== 1);

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)} modalSize="xl">
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">{t("role.assignDataScope")}</h2>
				<p className="text-sm text-muted-foreground">{t("role.assignDataScopeDesc")}</p>
			</div>

			{role && (
				<div className="mb-4 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
					<span className="font-medium text-foreground">{role.name}</span>
					<Badge variant="outline" className="font-mono text-xs">
						{role.code}
					</Badge>
				</div>
			)}

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>{t("dataScope.scopeLabel")}</Label>
					<Select
						value={String(dataScope)}
						onValueChange={(val) => setDataScope(Number(val) as DataScopeValue)}
						disabled={isScopeLoading}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{selectableOptions.map((opt) => (
								<SelectItem key={opt.value} value={String(opt.value)}>
									{t(opt.labelKey)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">{t(activeMeta.descKey)}</p>
				</div>

				{dataScope === 2 && (
					<div className="space-y-2">
						<Label>{t("dataScope.customDeptsLabel")}</Label>
						<DeptCheckboxTree
							depts={deptOptions}
							selectedIds={deptIds}
							onChange={setDeptIds}
							loading={isDeptLoading || isScopeLoading}
						/>
					</div>
				)}
			</div>

			<div className="pt-5 flex justify-end">
				<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
					{t("common.cancel")}
				</Button>
				<Button onClick={handleSubmit} disabled={mutation.isPending || isScopeLoading}>
					{mutation.isPending ? t("common.saving") : t("common.save")}
				</Button>
			</div>
		</Modal>
	);
}
