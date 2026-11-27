import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { cn } from "@zev/ui/lib/utils";
import { ChevronRight, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { PermTreeNode } from "@/api/interface/system/menu";
import { Checkbox } from "@/components/zev-table/checkbox";
import { useI18n } from "@/i18n";

export const PERM_FORMAT_REGEX = /^[a-z][a-z0-9_-]*(:[a-z0-9_-]+)+$/;

const PERM_SEGMENT_HINTS: Record<string, string> = {
	system: "系统",
	agent: "智能体",
	dashboard: "仪表盘",
	user: "用户",
	role: "角色",
	menu: "菜单",
	dept: "部门",
	dict: "字典",
	notice: "通知",
	operlog: "操作日志",
	loginlog: "登录日志",
	provider: "模型网关",
	workspace: "编排",
	playground: "演练场",
	chat: "对话",
	traces: "轨迹",
	approval: "审批",
	evals: "评测",
	list: "列表",
	create: "新增",
	update: "编辑",
	delete: "删除",
	assign: "分配",
	datascope: "数据权限",
	send: "发送",
	export: "导出",
	view: "查看",
	run: "运行",
	use: "使用",
	decide: "审批",
	manage: "管理",
};

interface MenuPermCascaderProps {
	value?: string;
	onChange: (value: string) => void;
	options: PermTreeNode[];
	loading?: boolean;
}

export function splitPermKeys(raw?: string): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	const out: string[] = [];
	for (const part of raw.split(",")) {
		const trimmed = part.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		out.push(trimmed);
	}
	return out;
}

function collectNodeLeafKeys(node: PermTreeNode): string[] {
	const keys: string[] = [];
	if (node.key) {
		keys.push(node.key);
	}
	if (node.children) {
		for (const child of node.children) {
			keys.push(...collectNodeLeafKeys(child));
		}
	}
	return keys;
}

function collectAllLeafKeys(nodes: PermTreeNode[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	const walk = (list: PermTreeNode[]) => {
		for (const node of list) {
			if (node.key && !seen.has(node.key)) {
				seen.add(node.key);
				out.push(node.key);
			}
			if (node.children) {
				walk(node.children);
			}
		}
	};
	walk(nodes);
	return out;
}

function findColumnPathToKey(nodes: PermTreeNode[], targetKey: string): string[] {
	for (const node of nodes) {
		if (node.key === targetKey) {
			return [];
		}
		if (node.children && node.children.length > 0) {
			if (node.children.some((child) => child.key === targetKey)) {
				return [node.value];
			}
			const sub = findColumnPathToKey(node.children, targetKey);
			if (sub.length > 0 || collectNodeLeafKeys(node).includes(targetKey)) {
				return [node.value, ...sub];
			}
		}
	}
	return [];
}

/**
 * 权限标识多列级联选择器（支持多选、父级全选/半选、关键词搜索与规范化自定义项）
 */
export function MenuPermCascader({ value = "", onChange, options, loading = false }: MenuPermCascaderProps) {
	const { t, locale } = useI18n();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [activePath, setActivePath] = useState<string[]>([]);

	const isZh = locale === "zh-CN";
	const selectedKeys = useMemo(() => splitPermKeys(value), [value]);
	const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
	const allLeafKeys = useMemo(() => collectAllLeafKeys(options), [options]);

	const commitKeys = (next: string[]) => {
		onChange(next.join(","));
	};

	const toggleBatchKeys = (keys: string[], checked: boolean) => {
		if (keys.length === 0) return;
		if (checked) {
			const merged = [...selectedKeys];
			for (const k of keys) {
				if (!selectedSet.has(k)) {
					merged.push(k);
				}
			}
			commitKeys(merged);
			return;
		}
		const removeSet = new Set(keys);
		commitKeys(selectedKeys.filter((k) => !removeSet.has(k)));
	};

	const removeSingleKey = (target: string) => {
		commitKeys(selectedKeys.filter((k) => k !== target));
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (nextOpen) {
			// 打开时自动展开首个已选权限所属列，方便用户直接定位上下文
			if (selectedKeys.length > 0) {
				setActivePath(findColumnPathToKey(options, selectedKeys[0]));
			} else if (options.length > 0) {
				setActivePath([options[0].value]);
			} else {
				setActivePath([]);
			}
		} else {
			setSearch("");
		}
	};

	// 根据激活路径动态计算多级级联面板的列列表
	const columns = useMemo(() => {
		if (options.length === 0) return [];
		const cols: PermTreeNode[][] = [options];
		let currentNodes = options;
		for (const seg of activePath) {
			const matched = currentNodes.find((item) => item.value === seg);
			if (!matched?.children || matched.children.length === 0) {
				break;
			}
			cols.push(matched.children);
			currentNodes = matched.children;
		}
		return cols;
	}, [options, activePath]);

	const trimmedSearch = search.trim();
	const searchableKeys = useMemo(() => {
		const merged = [...allLeafKeys];
		const existing = new Set(allLeafKeys);
		for (const k of selectedKeys) {
			if (!existing.has(k)) {
				merged.push(k);
			}
		}
		return merged;
	}, [allLeafKeys, selectedKeys]);

	const filteredSearchKeys = useMemo(() => {
		if (!trimmedSearch) return [];
		const kw = trimmedSearch.toLowerCase();
		return searchableKeys.filter((key) => {
			if (key.toLowerCase().includes(kw)) return true;
			if (isZh) {
				return key.split(":").some((seg) => PERM_SEGMENT_HINTS[seg]?.includes(trimmedSearch));
			}
			return false;
		});
	}, [searchableKeys, trimmedSearch, isZh]);

	const canAddCustomPerm =
		trimmedSearch.length > 0 &&
		PERM_FORMAT_REGEX.test(trimmedSearch) &&
		!searchableKeys.includes(trimmedSearch) &&
		!selectedSet.has(trimmedSearch);

	const renderHint = (segment: string) => {
		if (!isZh) return null;
		const hint = PERM_SEGMENT_HINTS[segment];
		if (!hint) return null;
		return <span className="truncate text-[11px] text-muted-foreground">{hint}</span>;
	};

	const visibleBadges = selectedKeys.slice(0, 2);
	const hiddenBadgeCount = selectedKeys.length - visibleBadges.length;

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<div className="flex items-start gap-1.5">
				<PopoverAnchor asChild>
					<div className="flex min-h-9 flex-1 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-none">
						{visibleBadges.map((permKey) => (
							<Badge
								key={permKey}
								variant="secondary"
								className="gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-normal"
							>
								<span>{permKey}</span>
								<button
									type="button"
									aria-label={`${t("common.delete")} ${permKey}`}
									onClick={() => removeSingleKey(permKey)}
									className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
								>
									<X className="h-2.5 w-2.5" />
								</button>
							</Badge>
						))}
						{hiddenBadgeCount > 0 && (
							<Badge variant="outline" className="rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-normal">
								+{hiddenBadgeCount}
							</Badge>
						)}
						<PopoverTrigger asChild>
							<button
								type="button"
								aria-expanded={open}
								className={cn(
									"flex flex-1 cursor-pointer items-center gap-2 text-left text-sm outline-none",
									selectedKeys.length === 0 ? "justify-between text-muted-foreground" : "min-w-6 justify-end",
								)}
							>
								{selectedKeys.length === 0 ? (
									<span>{t("menuPage.selectPerms")}</span>
								) : (
									<span className="sr-only">{t("menuPage.selectPerms")}</span>
								)}
								<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
							</button>
						</PopoverTrigger>
					</div>
				</PopoverAnchor>

				{selectedKeys.length > 0 ? (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-9 w-9 shrink-0 shadow-none text-muted-foreground hover:text-foreground"
						onClick={() => onChange("")}
						title={t("menuPage.clearPerms")}
					>
						<X className="h-4 w-4" />
					</Button>
				) : null}
			</div>

			<PopoverContent className="z-[60] w-auto min-w-[340px] max-w-[min(92vw,640px)] p-0" align="start">
				<div className="border-b border-border p-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t("menuPage.searchPerms")}
							className="h-8 pl-8 text-xs"
						/>
					</div>
				</div>

				{loading ? (
					<div className="px-4 py-10 text-center text-xs text-muted-foreground">{t("common.loading")}</div>
				) : trimmedSearch.length > 0 ? (
					<div className="max-h-64 overflow-y-auto p-1.5">
						{filteredSearchKeys.length > 0 ? (
							<div className="space-y-0.5">
								{filteredSearchKeys.map((permKey) => {
									const isChecked = selectedSet.has(permKey);
									return (
										<button
											key={permKey}
											type="button"
											onClick={() => toggleBatchKeys([permKey], !isChecked)}
											className={cn(
												"flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted",
												isChecked && "bg-muted/60",
											)}
										>
											<Checkbox checked={isChecked} tabIndex={-1} className="pointer-events-none shrink-0" />
											<span className="flex-1 truncate font-mono text-foreground">{permKey}</span>
										</button>
									);
								})}
							</div>
						) : !canAddCustomPerm ? (
							<div className="py-8 text-center text-xs text-muted-foreground">{t("menuPage.noPermFound")}</div>
						) : null}

						{canAddCustomPerm ? (
							<button
								type="button"
								onClick={() => {
									toggleBatchKeys([trimmedSearch], true);
									setSearch("");
								}}
								className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-2.5 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted"
							>
								<Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								<span className="truncate">
									{t("menuPage.addCustomPerm")}: <span className="font-mono font-medium">{trimmedSearch}</span>
								</span>
							</button>
						) : null}
					</div>
				) : columns.length === 0 ? (
					<div className="px-4 py-10 text-center text-xs text-muted-foreground">{t("menuPage.noPermFound")}</div>
				) : (
					<div className="flex max-w-full divide-x divide-border overflow-x-auto">
						{columns.map((colNodes, colIdx) => (
							<div
								key={colIdx === 0 ? "root" : activePath.slice(0, colIdx).join(":")}
								className="w-44 shrink-0 sm:w-48"
							>
								<div className="max-h-60 space-y-0.5 overflow-y-auto p-1.5">
									{colNodes.map((node) => {
										const hasChildren = Boolean(node.children && node.children.length > 0);
										const isActive = activePath[colIdx] === node.value;
										const leafKeys = collectNodeLeafKeys(node);
										const selectedLeafCount = leafKeys.filter((k) => selectedSet.has(k)).length;
										const checkState: boolean | "indeterminate" =
											selectedLeafCount === 0 ? false : selectedLeafCount === leafKeys.length ? true : "indeterminate";

										return (
											<div
												key={node.value}
												className={cn(
													"flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
													isActive && "bg-muted font-medium",
												)}
											>
												<Checkbox
													className="shrink-0"
													checked={checkState}
													onCheckedChange={(checked) => {
														const shouldCheck = checked === true;
														toggleBatchKeys(leafKeys, shouldCheck);
														if (hasChildren) {
															setActivePath([...activePath.slice(0, colIdx), node.value]);
														}
													}}
												/>
												<button
													type="button"
													onClick={() => {
														if (hasChildren) {
															setActivePath([...activePath.slice(0, colIdx), node.value]);
														} else if (node.key) {
															toggleBatchKeys([node.key], !selectedSet.has(node.key));
															setActivePath(activePath.slice(0, colIdx));
														}
													}}
													className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-1.5 text-left"
												>
													<span className="flex min-w-0 items-baseline gap-1.5 truncate">
														<span className="truncate font-mono text-foreground">{node.value}</span>
														{renderHint(node.value)}
													</span>
													{hasChildren ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
												</button>
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}

				<div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2 text-xs">
					<span className="text-muted-foreground">
						{t("menuPage.selectedPermsCount", { count: selectedKeys.length })}
					</span>
					<div className="flex items-center gap-1.5">
						{selectedKeys.length > 0 ? (
							<Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange("")}>
								{t("menuPage.clearPerms")}
							</Button>
						) : null}
						<Button type="button" size="sm" className="h-7 px-3 text-xs" onClick={() => handleOpenChange(false)}>
							{t("menuPage.confirmPerms")}
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
