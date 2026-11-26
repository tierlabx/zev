import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";

export function Main() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const reduce = useShouldReduceMotion();
	const revealTransition = useTempoTransition(motionTransition.reveal);

	return (
		<main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
			<div className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden min-h-0">
				<motion.div
					key={pathname}
					initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
					animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
					transition={revealTransition}
					className="flex-1 flex flex-col pb-4 min-h-0 min-w-0"
				>
					<Outlet />
				</motion.div>
			</div>
		</main>
	);
}
