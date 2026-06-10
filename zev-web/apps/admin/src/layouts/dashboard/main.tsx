import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

export function Main() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
			<div className="flex-1 p-4 overflow-auto">
				<AnimatePresence mode="wait">
					<motion.div
						key={pathname}
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
