import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@zev/ui/components/popover";
import { cn } from "@zev/ui/lib/utils";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { getMenuIcon, MENU_ICON_OPTIONS } from "@/utils/menu-icons";

interface MenuIconPickerProps {
	value?: string;
	onChange: (value: string) => void;
}

/**
 * 可视化图标网格选择器（支持关键词过滤与一键清除）
 */
export function MenuIconPicker({ value = "", onChange }: MenuIconPickerProps) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const [keyword, setKeyword] = useState("");

	const filteredOptions = useMemo(() => {
		const kw = keyword.trim().toLowerCase();
		if (!kw) return MENU_ICON_OPTIONS;
		return MENU_ICON_OPTIONS.filter((opt) => opt.name.toLowerCase().includes(kw));
	}, [keyword]);

	const CurrentIcon = value ? getMenuIcon(value) : null;

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setKeyword("");
		}
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<div className="flex items-center gap-1.5">
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						aria-expanded={open}
						className="flex-1 justify-between font-normal px-3 shadow-none"
					>
						<span className="flex items-center gap-2 truncate">
							{CurrentIcon ? (
								<>
									<CurrentIcon className="h-4 w-4 shrink-0 text-foreground" />
									<span className="truncate font-mono text-xs">{value}</span>
								</>
							) : (
								<span className="text-muted-foreground">{t("menuPage.selectIcon")}</span>
							)}
						</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				{value ? (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="shrink-0 shadow-none text-muted-foreground hover:text-foreground"
						onClick={() => onChange("")}
						title={t("menuPage.clearIcon")}
					>
						<X className="h-4 w-4" />
					</Button>
				) : null}
			</div>

			<PopoverContent className="z-[60] w-80 p-3" align="start">
				<div className="relative">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
						placeholder={t("menuPage.searchIcon")}
						className="h-8 pl-8 text-xs"
					/>
				</div>

				{filteredOptions.length > 0 ? (
					<div className="mt-2.5 grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto pr-0.5">
						{filteredOptions.map((opt) => {
							const IconComponent = opt.icon;
							const isSelected = value === opt.name;
							return (
								<button
									key={opt.name}
									type="button"
									title={opt.name}
									onClick={() => {
										onChange(opt.name);
										handleOpenChange(false);
									}}
									className={cn(
										"flex flex-col items-center justify-center gap-1 rounded-md border px-1.5 py-2 text-center transition-colors cursor-pointer",
										isSelected
											? "border-primary bg-primary text-primary-foreground"
											: "border-transparent bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
									)}
								>
									<IconComponent className="h-4 w-4 shrink-0" />
									<span className="w-full truncate font-mono text-[10px] leading-tight">{opt.name}</span>
								</button>
							);
						})}
					</div>
				) : (
					<div className="py-8 text-center text-xs text-muted-foreground">{t("menuPage.noIconFound")}</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
