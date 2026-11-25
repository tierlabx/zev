import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { motion } from "motion/react";
import { lazy, Suspense, useCallback, useState } from "react";
import { StaticKoiFallback } from "./StaticKoiFallback";

const ShaderCanvasLayer = lazy(() => import("./ShaderCanvasLayer"));

function detectWebGLCapable(): boolean {
	if (typeof document === "undefined") {
		return false;
	}
	try {
		const canvas = document.createElement("canvas");
		return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
	} catch {
		return false;
	}
}

/**
 * 基于 Three.js WebGL 的 3D 黑白锦鲤水池动态登录页背景。
 * 仅在支持 WebGL 且未开启“减弱动态效果”时按需异步加载 3D 画布，其余场景无感降级为 StaticKoiFallback。
 */
export default function ShaderKoiBackground() {
	const reduce = useShouldReduceMotion();
	const fadeTransition = useTempoTransition(motionTransition.overlay);

	const [webGlCapable] = useState(detectWebGLCapable);
	const [glUnavailable, setGlUnavailable] = useState(false);
	const [isReady, setIsReady] = useState(false);

	const shouldUse3D = !reduce && webGlCapable && !glUnavailable;

	const handleReady = useCallback(() => {
		setIsReady(true);
	}, []);

	const handleUnavailable = useCallback(() => {
		setGlUnavailable(true);
	}, []);

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={fadeTransition}
			className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none"
		>
			<StaticKoiFallback />
			{shouldUse3D ? (
				<Suspense fallback={null}>
					<ShaderCanvasLayer isReady={isReady} onReady={handleReady} onUnavailable={handleUnavailable} />
				</Suspense>
			) : null}
		</motion.div>
	);
}
