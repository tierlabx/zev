import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";

function App({ children }: { children: React.ReactNode }) {
	return (
		<MotionConfig reducedMotion="user">
			<Toaster position="top-center" />
			{children}
		</MotionConfig>
	);
}

export default App;
