import { AnimateUIProvider } from "@animate-ui/react/provider";
import type { Preview } from "@storybook/react-vite";
import { Toaster } from "@zev/ui/components/sonner";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import "../src/index.css";

const preview: Preview = {
	globalTypes: {
		theme: {
			description: "切换浅色/深色主题",
			toolbar: {
				title: "主题",
				icon: "mirror",
				items: [
					{ value: "light", title: "浅色模式" },
					{ value: "dark", title: "深色模式" },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		theme: "light",
	},
	decorators: [
		(Story, context) => {
			const theme = context.globals.theme === "dark" ? "dark" : "light";

			useEffect(() => {
				const root = document.documentElement;
				root.classList.toggle("dark", theme === "dark");
				root.classList.toggle("light", theme === "light");
			}, [theme]);

			return (
				<AnimateUIProvider>
					<MotionConfig reducedMotion="user">
						<Toaster position="top-center" />
						<div className="min-h-[160px] bg-background text-foreground p-4 antialiased">
							<Story />
						</div>
					</MotionConfig>
				</AnimateUIProvider>
			);
		},
	],
};

export default preview;
