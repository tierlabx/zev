import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { queryClient } from "@/api/queryClient";

function App({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<MotionConfig reducedMotion="user">
				<Toaster position="top-center" />
				{children}
			</MotionConfig>
		</QueryClientProvider>
	);
}

export default App;
