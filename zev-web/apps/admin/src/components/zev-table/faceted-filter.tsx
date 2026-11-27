import { Badge } from "@zev/ui/components/badge";
import { Button } from "@zev/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@zev/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { Separator } from "@zev/ui/components/separator";
import { cn } from "@zev/ui/lib/utils";
import { Check, PlusCircle } from "lucide-react";
import type { ComponentType } from "react";
import { useI18n } from "@/i18n";

export interface FacetedFilterOption {
	label: string;
	value: string;
	icon?: ComponentType<{ className?: string }>;
	count?: number;
}

type TableFacetedFilterBaseProps = {
	title: string;
	options: FacetedFilterOption[];
	searchPlaceholder?: string;
	className?: string;
};

type SingleSelectProps = TableFacetedFilterBaseProps & {
	multiple?: false;
	value: string;
	onChange: (value: string) => void;
	/** 未选中任何项时回退的值，默认 "all" */
	emptyValue?: string;
};

type MultiSelectProps = TableFacetedFilterBaseProps & {
	multiple: true;
	values: string[];
	onValuesChange: (values: string[]) => void;
};

export type TableFacetedFilterProps = SingleSelectProps | MultiSelectProps;

/**
 * shadcn-admin 风格的表格分面筛选器：
 * 虚线边框触发按钮 + 选中值徽章 + 内嵌 cmdk 可搜索浮层 + 底部清除操作。
 */
export function TableFacetedFilter(props: TableFacetedFilterProps) {
	const { t } = useI18n();
	const { title, options, searchPlaceholder, className } = props;

	const selectedValues = props.multiple
		? new Set(props.values)
		: props.value !== (props.emptyValue ?? "all") && props.value !== ""
			? new Set([props.value])
			: new Set<string>();

	const selectedOptions = options.filter((opt) => selectedValues.has(opt.value));

	const handleToggle = (optionValue: string) => {
		if (props.multiple) {
			const next = new Set(props.values);
			if (next.has(optionValue)) {
				next.delete(optionValue);
			} else {
				next.add(optionValue);
			}
			props.onValuesChange(Array.from(next));
			return;
		}
		const emptyVal = props.emptyValue ?? "all";
		props.onChange(props.value === optionValue ? emptyVal : optionValue);
	};

	const handleClear = () => {
		if (props.multiple) {
			props.onValuesChange([]);
			return;
		}
		props.onChange(props.emptyValue ?? "all");
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className={cn("h-8 border-dashed shadow-none font-normal", className)}
				>
					<PlusCircle className="h-3.5 w-3.5 text-muted-foreground" />
					<span className="font-medium">{title}</span>
					{selectedOptions.length > 0 ? (
						<>
							<Separator orientation="vertical" className="mx-1 h-4" />
							<Badge variant="secondary" className="rounded-sm px-1.5 font-normal lg:hidden">
								{selectedOptions.length}
							</Badge>
							<div className="hidden gap-1 lg:flex">
								{selectedOptions.length > 2 ? (
									<Badge variant="secondary" className="rounded-sm px-1.5 font-normal">
										{t("table.selectedCount", { count: selectedOptions.length })}
									</Badge>
								) : (
									selectedOptions.map((option) => (
										<Badge key={option.value} variant="secondary" className="rounded-sm px-1.5 font-normal">
											{option.label}
										</Badge>
									))
								)}
							</div>
						</>
					) : null}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[210px] p-0" align="start">
				<Command>
					<CommandInput placeholder={searchPlaceholder ?? title} className="h-9" />
					<CommandList>
						<CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
							{t("table.noFilterResults")}
						</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = selectedValues.has(option.value);
								const OptionIcon = option.icon;
								return (
									<CommandItem
										key={option.value}
										value={`${option.label} ${option.value}`}
										onSelect={() => handleToggle(option.value)}
										className="cursor-pointer gap-2"
									>
										<div
											className={cn(
												"flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors [&_svg]:size-2.5",
												isSelected
													? "border-foreground bg-foreground text-background"
													: "border-muted-foreground/40 text-transparent",
											)}
										>
											<Check />
										</div>
										{OptionIcon ? <OptionIcon className="size-3.5 text-muted-foreground shrink-0" /> : null}
										<span className="truncate">{option.label}</span>
										{option.count !== undefined ? (
											<span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
												{option.count}
											</span>
										) : null}
									</CommandItem>
								);
							})}
						</CommandGroup>
						{selectedOptions.length > 0 ? (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem onSelect={handleClear} className="cursor-pointer justify-center text-center text-xs">
										{t("table.clearFilters")}
									</CommandItem>
								</CommandGroup>
							</>
						) : null}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
