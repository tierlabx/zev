import { Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function Main() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
			<div className="flex-1 p-4 overflow-auto">
				<motion.div
					key={pathname}
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="h-full"
				>
					<Outlet />
				</motion.div>
			</div>
		</main>
	);
}
