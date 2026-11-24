import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zev/ui/components/select";
import { Switch } from "@zev/ui/components/switch";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { DeptTreeNode } from "@/api/system/dept";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useI18n } from "@/i18n";
import { collectAllNodeIds, filterTreeByKeyword, flattenTreeWithLevel, toggleTreeSelection } from "@/utils/tree";

interface DeptSelectProps {
	value: number;
	onChange: (value: number) => void;
	depts: DeptTreeNode[];
	disabledIds?: Set<number>;
	includeRootOption?: boolean;
	rootLabel?: string;
	placeholder?: string;
	disabled?: boolean;
}

/**
 * 层级缩进部门单选下拉器
 */
export function DeptSelect({
	value,
	onChange,
	depts,
	disabledIds,
	includeRootOption = false,
	rootLabel,
	placeholder,
	disabled = false,
}: DeptSelectProps) {
	const { t } = useI18n();
	const flattened = useMemo(() => flattenTreeWithLevel(depts), [depts]);
	const selectValue = value > 0 ? String(value) : includeRootOption ? "0" : "";

	return (
		<Select value={selectValue} onValueChange={(val) => onChange(Number(val))} disabled={disabled}>
			<SelectTrigger>
				<SelectValue placeholder={placeholder ?? t("dept.selectDeptPlaceholder")} />
			</SelectTrigger>
			<SelectContent>
				{includeRootOption && <SelectItem value="0">{rootLabel ?? t("dept.topLevelDept")}</SelectItem>}
				{flattened.map((dept) => (
					<SelectItem key={dept.ID} value={String(dept.ID)} disabled={disabledIds?.has(dept.ID) || dept.status === 1}>
						<span style={{ paddingLeft: `${dept.level * 14}px` }} className="inline-flex items-center gap-1.5">
							{dept.level > 0 && <span className="text-muted-foreground">└</span>}
							<span>{dept.name}</span>
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

interface DeptCheckboxTreeProps {
	depts: DeptTreeNode[];
	selectedIds: number[];
	onChange: (ids: number[]) => void;
	loading?: boolean;
}

/**
 * 支持搜索、展开折叠、全选与父子联动的部门多选树
 */
export function DeptCheckboxTree({ depts, selectedIds, onChange, loading = false }: DeptCheckboxTreeProps) {
	const { t } = useI18n();
	const cascadeId = useId();
	const [keyword, setKeyword] = useState("");
	const [cascade, setCascade] = useState(true);
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

	const allIds = useMemo(() => collectAllNodeIds(depts), [depts]);

	useEffect(() => {
		if (depts.length > 0) {
			setExpandedIds(new Set(allIds));
		}
	}, [depts, allIds]);

	const filteredTree = useMemo(
		() =>
			filterTreeByKeyword(
				depts,
				keyword,
				(node, kw) => node.name.toLowerCase().includes(kw) || node.code.toLowerCase().includes(kw),
			),
		[depts, keyword],
	);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const toggleExpand = (id: number) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleCheck = (deptId: number, checked: boolean) => {
		const next = toggleTreeSelection(depts, selectedSet, deptId, checked, cascade);
		onChange(Array.from(next));
	};

	const renderNodes = (nodes: DeptTreeNode[], level = 0) =>
		nodes.map((node) => {
			const hasChildren = node.children && node.children.length > 0;
			const isExpanded = keyword.trim() !== "" || expandedIds.has(node.ID);
			const isChecked = selectedSet.has(node.ID);

			return (
				<div key={node.ID} className="flex flex-col">
					<div
						className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/70 transition-colors"
						style={{ paddingLeft: `${level * 18 + 6}px` }}
					>
						{hasChildren ? (
							<button
								type="button"
								onClick={() => toggleExpand(node.ID)}
								className="p-0.5 text-muted-foreground hover:text-foreground"
								aria-label={node.name}
							>
								{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
							</button>
						) : (
							<span className="w-4.5" />
						)}
						<Checkbox
							id={`dept-tree-${node.ID}`}
							checked={isChecked}
							onCheckedChange={(val) => handleCheck(node.ID, val === true)}
						/>
						<label htmlFor={`dept-tree-${node.ID}`} className="flex-1 cursor-pointer select-none text-sm">
							<span>{node.name}</span>
							<span className="ml-2 text-xs text-muted-foreground">{node.code}</span>
						</label>
					</div>
					{hasChildren && isExpanded && renderNodes(node.children, level + 1)}
				</div>
			);
		});

	return (
		<div className="space-y-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="relative flex-1 min-w-[180px]">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
						placeholder={t("dept.searchPlaceholder")}
						className="h-8 pl-8 text-xs"
					/>
				</div>
				<div className="flex items-center gap-1.5">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2 text-xs"
						onClick={() => setExpandedIds(new Set(allIds))}
					>
						{t("common.expandAll")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2 text-xs"
						onClick={() => setExpandedIds(new Set())}
					>
						{t("common.collapseAll")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2 text-xs"
						onClick={() => onChange(allIds)}
					>
						{t("common.selectAll")}
					</Button>
					<Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange([])}>
						{t("common.clearAll")}
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>{t("dataScope.selectedDeptsCount", { count: selectedIds.length })}</span>
				<div className="inline-flex items-center gap-2">
					<label htmlFor={cascadeId} className="cursor-pointer select-none">
						{t("common.treeCascade")}
					</label>
					<Switch id={cascadeId} checked={cascade} onCheckedChange={setCascade} />
				</div>
			</div>

			<div className="max-h-[250px] overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
				{loading ? (
					<div className="py-8 text-center text-xs text-muted-foreground">{t("common.loading")}</div>
				) : filteredTree.length > 0 ? (
					renderNodes(filteredTree)
				) : (
					<div className="py-8 text-center text-xs text-muted-foreground">{t("dept.noDepts")}</div>
				)}
			</div>
		</div>
	);
}
