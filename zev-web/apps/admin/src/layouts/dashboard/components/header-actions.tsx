import { type Resolved, type ThemeSelection, ThemeToggler } from "@animate-ui/react/primitives/effects/theme-toggler";
import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@zev/ui/components/dropdown-menu";
import { cn } from "@zev/ui/lib/utils";
import { Check, Globe, Maximize, Minimize, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LOCALE_OPTIONS, useI18n } from "@/i18n";

function toThemeSelection(value: string | undefined): ThemeSelection {
	if (value === "light" || value === "dark" || value === "system") {
		return value;
	}
	return "system";
}

function toResolvedTheme(value: string | undefined): Resolved {
	return value === "dark" ? "dark" : "light";
}

function SwapIcon({ iconKey, children }: { iconKey: string; children: React.ReactNode }) {
	const reduce = useShouldReduceMotion();
	const swapTransition = useTempoTransition(motionTransition.swap);

	return (
		<AnimatePresence mode="wait" initial={false}>
			<motion.span
				key={iconKey}
				initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.8 }}
				animate={reduce ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
				exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.8 }}
				transition={swapTransition}
				className="inline-flex items-center justify-center"
			>
				{children}
			</motion.span>
		</AnimatePresence>
	);
}

export function HeaderActions() {
	const { theme, resolvedTheme, systemTheme, setTheme } = useTheme();
	const { locale, setLocale, t } = useI18n();
	const [isFullscreen, setIsFullscreen] = useState(false);

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

	return (
		<>
			<button
				type="button"
				onClick={toggleFullscreen}
				aria-label={isFullscreen ? t("header.exitFullscreen") : t("header.fullscreen")}
				title={isFullscreen ? t("header.exitFullscreen") : t("header.fullscreen")}
				className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors group"
			>
				<SwapIcon iconKey={isFullscreen ? "minimize" : "maximize"}>
					{isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
				</SwapIcon>
			</button>

			<ThemeToggler
				theme={toThemeSelection(theme)}
				resolvedTheme={toResolvedTheme(resolvedTheme)}
				setTheme={setTheme}
				direction="ltr"
			>
				{({ resolved, toggleTheme }) => {
					const isDark = resolved === "dark";
					const handleToggle = () => {
						const targetTheme: Resolved = isDark ? "light" : "dark";
						// 目标主题与系统偏好一致时恢复为跟随系统，避免隐性钉死主题
						toggleTheme(targetTheme === systemTheme ? "system" : targetTheme);
					};

					return (
						<button
							type="button"
							onClick={handleToggle}
							aria-label={isDark ? t("header.switchToLight") : t("header.switchToDark")}
							title={isDark ? t("header.switchToLight") : t("header.switchToDark")}
							className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors group"
						>
							<SwapIcon iconKey={isDark ? "sun" : "moon"}>
								{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
							</SwapIcon>
						</button>
					);
				}}
			</ThemeToggler>

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
