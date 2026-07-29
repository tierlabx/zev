import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { queryClient } from "@/api/queryClient";

import { ThemeProvider } from "next-themes";

function App({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
				<MotionConfig reducedMotion="user">
					<Toaster position="top-center" />
					{children}
				</MotionConfig>
			</ThemeProvider>
		</QueryClientProvider>
	);
}

export default App;
