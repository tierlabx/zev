import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

export function Main() {
	const location = useLocation();

	return (
		<main className="flex-1 flex flex-col relative overflow-hidden bg-[#FAFAFA]">
			<div className="flex-1 p-[48px] overflow-auto">
				<AnimatePresence mode="wait">
					<motion.div
						key={location.pathname}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="h-full"
					>
						<Outlet />
					</motion.div>
				</AnimatePresence>
			</div>
		</main>
	);
}
