import { Button } from "@zev/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@zev/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { cn } from "@zev/ui/lib/utils";
import { Check, ChevronsUpDown, FolderTree } from "lucide-react";
import { useMemo, useState } from "react";
import type { Menu } from "@/api/system/menu";
import { useI18n } from "@/i18n";
import { getMenuIcon } from "@/utils/menu-icons";
import { flattenTreeWithLevel } from "@/utils/tree";

interface MenuParentSelectProps {
	value: number;
	onChange: (value: number) => void;
	menus: Menu[];
	disabledIds?: Set<number>;
	menuType: string;
}

/**
 * 过滤掉按钮节点（F 类型），仅保留可作为上级容器的目录（M）与菜单（C）
 */
function filterSelectableParents(nodes: Menu[]): Menu[] {
	return nodes
		.filter((node) => node.type !== "F")
		.map((node) => ({
			...node,
			children: node.children ? filterSelectableParents(node.children) : undefined,
		}));
}

/**
 * 可搜索层级上级菜单选择器（Popover + Command）
 */
export function MenuParentSelect({ value, onChange, menus, disabledIds, menuType }: MenuParentSelectProps) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);

	const flattened = useMemo(() => flattenTreeWithLevel(filterSelectableParents(menus)), [menus]);

	const selectedMenu = useMemo(() => flattened.find((item) => item.ID === value), [flattened, value]);

	const typeLabel = (type: string) => {
		if (type === "M") return t("menuPage.typeDir");
		if (type === "C") return t("menuPage.typeMenu");
		return type;
	};

	const showRootOption = menuType !== "F" || value === 0;
	const SelectedIcon = selectedMenu ? getMenuIcon(selectedMenu.icon) : FolderTree;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal px-3 shadow-none"
				>
					<span className="flex items-center gap-2 truncate">
						<SelectedIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
						{value === 0 ? (
							<span>{t("menuPage.topLevelMenu")}</span>
						) : selectedMenu ? (
							<span className="truncate">{selectedMenu.name}</span>
						) : (
							<span className="text-muted-foreground">{`#${value}`}</span>
						)}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
				<Command>
					<CommandInput placeholder={t("menuPage.searchParent")} />
					<CommandList className="max-h-60">
						<CommandEmpty>{t("menuPage.noMenuFound")}</CommandEmpty>
						<CommandGroup>
							{showRootOption && (
								<CommandItem
									value={`0 ${t("menuPage.topLevelMenu")} root`}
									onSelect={() => {
										onChange(0);
										setOpen(false);
									}}
								>
									<Check className={cn("mr-1.5 h-4 w-4 shrink-0", value === 0 ? "opacity-100" : "opacity-0")} />
									<FolderTree className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
									<span className="flex-1 truncate">{t("menuPage.topLevelMenu")}</span>
									<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
										ID: 0
									</span>
								</CommandItem>
							)}
							{flattened.map((node) => {
								const isDisabled = disabledIds?.has(node.ID) ?? false;
								const isSelected = value === node.ID;
								const NodeIcon = getMenuIcon(node.icon);
								return (
									<CommandItem
										key={node.ID}
										disabled={isDisabled}
										value={`${node.ID} ${node.name} ${node.path}`}
										onSelect={() => {
											if (isDisabled) return;
											onChange(node.ID);
											setOpen(false);
										}}
									>
										<Check className={cn("mr-1.5 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
										<span
											style={{ paddingLeft: `${node.level * 12}px` }}
											className="flex flex-1 items-center gap-1.5 truncate"
										>
											{node.level > 0 && <span className="text-muted-foreground">└</span>}
											<NodeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span className="truncate">{node.name}</span>
										</span>
										<span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
											{typeLabel(node.type)}
										</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
