import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "@zev/ui/components/animate/overlay/modal";
import { Button } from "@zev/ui/components/button";
import { Switch } from "@zev/ui/components/switch";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { getMenuTree, type Menu } from "@/api/system/menu";
import { assignRoleMenus, getRoleMenus } from "@/api/system/role";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useI18n } from "@/i18n";
import { collectAllNodeIds, toggleTreeSelection } from "@/utils/tree";

interface AssignMenuDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	roleId: number | null;
	onSuccess: () => void;
}

export function AssignMenuDialog({ open, onOpenChange, roleId, onSuccess }: AssignMenuDialogProps) {
	const { t } = useI18n();
	const cascadeId = useId();
	const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(new Set());
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
	const [cascade, setCascade] = useState(true);

	const { data: menuTree = [], isLoading: isMenusLoading } = useQuery({
		queryKey: ["menus"],
		queryFn: getMenuTree,
		enabled: open,
	});

	const { data: roleMenus, isLoading: isRoleMenusLoading } = useQuery({
		queryKey: ["roleMenus", roleId],
		queryFn: () => getRoleMenus(roleId as number),
		enabled: open && roleId !== null,
	});

	const allMenuIds = useMemo(() => collectAllNodeIds(menuTree), [menuTree]);

	useEffect(() => {
		if (open && menuTree.length > 0) {
			setExpandedIds(new Set(allMenuIds));
		}
	}, [open, menuTree, allMenuIds]);

	useEffect(() => {
		if (open && roleMenus) {
			setSelectedMenuIds(new Set(roleMenus));
		} else if (!open) {
			setSelectedMenuIds(new Set());
		}
	}, [open, roleMenus]);

	const assignMutation = useMutation({
		mutationFn: (menuIds: number[]) => assignRoleMenus(roleId as number, menuIds),
		onSuccess: () => {
			toast.success(t("role.assignMenuSuccess"));
			onSuccess();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || t("role.assignMenuFailed"));
		},
	});

	const handleSubmit = () => {
		if (roleId === null) return;
		assignMutation.mutate(Array.from(selectedMenuIds));
	};

	const handleToggle = (menuId: number, checked: boolean) => {
		setSelectedMenuIds((prev) => toggleTreeSelection(menuTree, prev, menuId, checked, cascade));
	};

	const toggleExpand = (menuId: number) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(menuId)) {
				next.delete(menuId);
			} else {
				next.add(menuId);
			}
			return next;
		});
	};

	const renderTree = (menus: Menu[], level = 0) => {
		return menus.map((menu) => {
			const hasChildren = Boolean(menu.children && menu.children.length > 0);
			const isExpanded = expandedIds.has(menu.ID);

			return (
				<div key={menu.ID} className="flex flex-col">
					<div
						className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/70 transition-colors"
						style={{ paddingLeft: `${level * 20 + 4}px` }}
					>
						{hasChildren ? (
							<button
								type="button"
								onClick={() => toggleExpand(menu.ID)}
								className="p-0.5 text-muted-foreground hover:text-foreground"
								aria-label={menu.name}
							>
								{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
							</button>
						) : (
							<span className="w-4.5" />
						)}
						<Checkbox
							id={`menu-${menu.ID}`}
							checked={selectedMenuIds.has(menu.ID)}
							onCheckedChange={(checked) => handleToggle(menu.ID, checked === true)}
						/>
						<label
							htmlFor={`menu-${menu.ID}`}
							className="flex flex-1 items-center justify-between gap-2 text-sm cursor-pointer select-none"
						>
							<span>{menu.name}</span>
							{menu.perms && <span className="text-[11px] font-mono text-muted-foreground">{menu.perms}</span>}
						</label>
					</div>
					{hasChildren && isExpanded && menu.children && renderTree(menu.children, level + 1)}
				</div>
			);
		});
	};

	const isLoading = isMenusLoading || isRoleMenusLoading;

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)}>
			<div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
				<h2 className="text-lg font-semibold leading-none tracking-tight">{t("role.assignMenu")}</h2>
				<p className="text-sm text-muted-foreground">{t("role.assignMenuDesc")}</p>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 mb-3">
				<div className="flex items-center gap-1.5">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2.5 text-xs"
						onClick={() => setExpandedIds(new Set(allMenuIds))}
					>
						{t("common.expandAll")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2.5 text-xs"
						onClick={() => setExpandedIds(new Set())}
					>
						{t("common.collapseAll")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2.5 text-xs"
						onClick={() => setSelectedMenuIds(new Set(allMenuIds))}
					>
						{t("common.selectAll")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2.5 text-xs"
						onClick={() => setSelectedMenuIds(new Set())}
					>
						{t("common.clearAll")}
					</Button>
				</div>

				<div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
					<label htmlFor={cascadeId} className="cursor-pointer select-none">
						{t("common.treeCascade")}
					</label>
					<Switch id={cascadeId} checked={cascade} onCheckedChange={setCascade} />
				</div>
			</div>

			<div className="max-h-[52vh] overflow-y-auto border border-border rounded-md p-3 bg-muted/30">
				{isLoading ? (
					<div className="text-center text-sm text-muted-foreground py-8">{t("common.loading")}</div>
				) : menuTree.length > 0 ? (
					renderTree(menuTree)
				) : (
					<div className="text-center text-sm text-muted-foreground py-8">{t("role.noMenus")}</div>
				)}
			</div>

			<div className="pt-4 flex justify-end">
				<Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)}>
					{t("common.cancel")}
				</Button>
				<Button onClick={handleSubmit} disabled={assignMutation.isPending || isLoading}>
					{assignMutation.isPending ? t("common.saving") : t("common.save")}
				</Button>
			</div>
		</Modal>
	);
}
