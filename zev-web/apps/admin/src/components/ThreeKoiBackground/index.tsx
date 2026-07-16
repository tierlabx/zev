import { Canvas } from "@react-three/fiber";
import { motion } from "framer-motion";
import { Suspense } from "react";
import { Scene } from "./Scene";

export default function ThreeKoiBackground() {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1.5, ease: "easeOut" }}
			className="absolute inset-0 w-full h-full -z-10 overflow-hidden bg-slate-900 pointer-events-none"
		>
			<Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
				<Suspense fallback={null}>
					<Scene />
				</Suspense>
			</Canvas>
		</motion.div>
	);
}
