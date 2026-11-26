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
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";
import { getMenuIcon } from "@/utils/menu-icons";
import { getFrontendRouteOptions } from "@/utils/menu-utils";

interface RouteSelectProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
}

/**
 * 可搜索的前端页面路由选择器，用于消息跳转路由等场景
 */
export function RouteSelect({ value, onChange, placeholder, disabled = false }: RouteSelectProps) {
	const { t, translateMenu } = useI18n();
	const menus = useUserStore((state) => state.menus);
	const [open, setOpen] = useState(false);

	const routeOptions = useMemo(() => getFrontendRouteOptions(menus), [menus]);
	const selectedRoute = useMemo(() => routeOptions.find((item) => item.path === value), [routeOptions, value]);
	const SelectedIcon = selectedRoute ? getMenuIcon(selectedRoute.icon) : null;

	return (
		<div className="flex items-center gap-1.5">
			<Popover modal open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className="w-full flex-1 justify-between font-normal px-3 min-w-0"
					>
						{selectedRoute && SelectedIcon ? (
							<span className="flex items-center gap-2 min-w-0">
								<SelectedIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="truncate">{translateMenu(selectedRoute.path, selectedRoute.name)}</span>
								<span className="truncate font-mono text-xs text-muted-foreground">{selectedRoute.path}</span>
							</span>
						) : value ? (
							<span className="truncate font-mono text-xs">{value}</span>
						) : (
							<span className="truncate text-muted-foreground">{placeholder ?? t("notice.linkSelectPlaceholder")}</span>
						)}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>

				<PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
					<Command>
						<CommandInput placeholder={t("notice.linkSearchPlaceholder")} />
						<CommandList onWheel={(e) => e.stopPropagation()}>
							<CommandEmpty>{t("notice.linkNoRoute")}</CommandEmpty>
							<CommandGroup>
								{routeOptions.map((route) => {
									const Icon = getMenuIcon(route.icon);
									const label = translateMenu(route.path, route.name);
									const selected = route.path === value;
									return (
										<CommandItem
											key={route.path}
											value={`${label} ${route.name} ${route.path}`}
											onSelect={() => {
												onChange(selected ? "" : route.path);
												setOpen(false);
											}}
										>
											<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
											<span className="truncate">{label}</span>
											<span className="ml-auto font-mono text-xs text-muted-foreground">{route.path}</span>
											<Check className={cn("ml-1 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
										</CommandItem>
									);
								})}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{value && !disabled ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={t("notice.linkClear")}
					title={t("notice.linkClear")}
					onClick={() => onChange("")}
					className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
				>
					<X className="h-4 w-4" />
				</Button>
			) : null}
		</div>
	);
}
