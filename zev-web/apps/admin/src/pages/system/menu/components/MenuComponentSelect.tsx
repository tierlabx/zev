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
import { Check, ChevronsUpDown, FileCode2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { REGISTERED_COMPONENT_PATHS } from "@/router/components";

interface MenuComponentSelectProps {
	value?: string;
	onChange: (value: string) => void;
}

/**
 * 已注册页面组件路径选择器，同时允许在搜索不到时使用自定义路径
 */
export function MenuComponentSelect({ value = "", onChange }: MenuComponentSelectProps) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const trimmedSearch = search.trim();
	const showCustomOption =
		trimmedSearch.length > 0 && !REGISTERED_COMPONENT_PATHS.some((item) => item === trimmedSearch);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setSearch("");
		}
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal px-3 shadow-none"
				>
					<span className="flex items-center gap-2 truncate">
						<FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
						{value ? (
							<span className="truncate font-mono text-xs">{value}</span>
						) : (
							<span className="text-muted-foreground">{t("menuPage.selectComponent")}</span>
						)}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
				<Command>
					<CommandInput value={search} onValueChange={setSearch} placeholder={t("menuPage.searchComponent")} />
					<CommandList className="max-h-60">
						<CommandEmpty>{t("menuPage.noComponentFound")}</CommandEmpty>
						<CommandGroup>
							{REGISTERED_COMPONENT_PATHS.map((compPath) => {
								const isSelected = value === compPath;
								return (
									<CommandItem
										key={compPath}
										value={compPath}
										onSelect={() => {
											onChange(compPath);
											handleOpenChange(false);
										}}
									>
										<Check className={cn("mr-1.5 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
										<span className="truncate font-mono text-xs">{compPath}</span>
									</CommandItem>
								);
							})}
							{showCustomOption ? (
								<CommandItem
									value={trimmedSearch}
									onSelect={() => {
										onChange(trimmedSearch);
										handleOpenChange(false);
									}}
								>
									<Check
										className={cn("mr-1.5 h-4 w-4 shrink-0", value === trimmedSearch ? "opacity-100" : "opacity-0")}
									/>
									<span className="truncate text-xs text-muted-foreground">
										{t("menuPage.useCustomComponent")}:{" "}
										<span className="font-mono text-foreground">{trimmedSearch}</span>
									</span>
								</CommandItem>
							) : null}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
