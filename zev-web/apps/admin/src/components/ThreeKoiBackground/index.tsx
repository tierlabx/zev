import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { Canvas } from "@react-three/fiber";
import { motion } from "motion/react";
import { Suspense } from "react";
import { Scene } from "./Scene";

export default function ThreeKoiBackground() {
	const reduce = useShouldReduceMotion();
	const fadeTransition = useTempoTransition(motionTransition.overlay);

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={fadeTransition}
			className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none"
		>
			<Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
				<Suspense fallback={null}>
					<Scene />
				</Suspense>
			</Canvas>
		</motion.div>
	);
}
