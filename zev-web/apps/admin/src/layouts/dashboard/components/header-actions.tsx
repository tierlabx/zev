import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@zev/ui/components/dropdown-menu";
import { cn } from "@zev/ui/lib/utils";
import { Check, Globe, Maximize, Minimize, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LOCALE_OPTIONS, useI18n } from "@/i18n";

export function HeaderActions() {
	const { resolvedTheme, systemTheme, setTheme } = useTheme();
	const { locale, setLocale, t } = useI18n();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const isDark = resolvedTheme === "dark";

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
		} else {
			document.exitFullscreen().catch(() => {});
		}
	};

	const handleToggleTheme = () => {
		const targetTheme = isDark ? "light" : "dark";
		// 目标主题与系统偏好一致时恢复为跟随系统，避免隐性钉死主题
		setTheme(targetTheme === systemTheme ? "system" : targetTheme);
	};

	return (
		<>
			<button
				type="button"
				onClick={toggleFullscreen}
				aria-label={isFullscreen ? t("header.exitFullscreen") : t("header.fullscreen")}
				title={isFullscreen ? t("header.exitFullscreen") : t("header.fullscreen")}
				className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors group"
			>
				{isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
			</button>

			<button
				type="button"
				onClick={handleToggleTheme}
				aria-label={isDark ? t("header.switchToLight") : t("header.switchToDark")}
				title={isDark ? t("header.switchToLight") : t("header.switchToDark")}
				className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors group"
			>
				{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={t("header.switchLanguage")}
						title={t("header.switchLanguage")}
						className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors group outline-none"
					>
						<Globe className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-[140px]">
					{LOCALE_OPTIONS.map((option) => {
						const isActive = locale === option.value;
						return (
							<DropdownMenuItem
								key={option.value}
								onClick={() => setLocale(option.value)}
								className={cn(
									"cursor-pointer justify-between",
									isActive && "bg-accent text-accent-foreground font-medium",
								)}
							>
								<span>{option.label}</span>
								{isActive && <Check className="size-3.5 text-primary" />}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
