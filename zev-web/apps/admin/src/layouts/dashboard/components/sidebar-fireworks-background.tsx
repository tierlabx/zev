import { FireworksBackground } from "@zev/ui/components/animate-ui/backgrounds/fireworks";
import { useTheme } from "next-themes";

const LIGHT_FIREWORK_COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8"];
const DARK_FIREWORK_COLORS = ["#f8fafc", "#e2e8f0", "#cbd5e1", "#94a3b8"];

/**
 * 侧边栏专用烟花氛围背景
 * 遵循系统极简黑白灰美学，按当前主题切换低对比灰度色阶，并控制密度避免干扰导航阅读。
 */
export function SidebarFireworksBackground({ collapsed = false }: { collapsed?: boolean }) {
	const { resolvedTheme } = useTheme();
	const colors = resolvedTheme === "dark" ? DARK_FIREWORK_COLORS : LIGHT_FIREWORK_COLORS;

	return (
		<FireworksBackground
			aria-hidden="true"
			population={collapsed ? 0.2 : 0.35}
			color={colors}
			fireworkSpeed={{ min: 5, max: 8 }}
			fireworkSize={{ min: 1.5, max: 2.5 }}
			particleSpeed={collapsed ? { min: 0.8, max: 2 } : { min: 1.2, max: 3.6 }}
			particleSize={{ min: 1, max: 2.2 }}
			className="pointer-events-none absolute inset-0 z-0 opacity-35 dark:opacity-45"
		/>
	);
}
