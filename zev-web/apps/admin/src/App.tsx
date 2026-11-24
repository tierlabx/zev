import { AnimateUIProvider } from "@animate-ui/react/provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@zev/ui/components/sonner";
import { MotionConfig } from "motion/react";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import { queryClient } from "@/api/queryClient";

/**
 * 将当前主题模式同步到 <meta name="color-scheme">，使浏览器原生滚动条与控件跟随切换
 */
function ThemeMetaSync() {
	const { theme } = useTheme();

	useEffect(() => {
		const meta = document.querySelector('meta[name="color-scheme"]');
		if (!meta) return;
		meta.setAttribute("content", theme === "dark" || theme === "light" ? theme : "light dark");
	}, [theme]);

	return null;
}

function App({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
				<ThemeMetaSync />
				<AnimateUIProvider>
					<MotionConfig reducedMotion="user">
						<Toaster position="top-center" />
						{children}
					</MotionConfig>
				</AnimateUIProvider>
			</ThemeProvider>
		</QueryClientProvider>
	);
}

export default App;
