import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { motion } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { rasterizeSvgToPngBlobUrl } from "@/utils/svg-texture";
import bgOnlyStatic from "../../assets/bg-only.svg";
import blackFishStatic from "../../assets/black-fish.svg";
import whiteFishStatic from "../../assets/white-fish.svg";
import type { KoiTextures } from "./ShaderCanvasLayer";
import { StaticKoiFallback } from "./StaticKoiFallback";

const ShaderCanvasLayer = lazy(() => import("./ShaderCanvasLayer"));

/**
 * 基于 WebGPU（shaders@4.0.7 + 自定义 WGSL）的太极双鱼动态登录页背景。
 * 仅在支持 WebGPU 且未开启“减弱动态效果”时按需异步加载着色器画布，其余场景无感降级为 StaticKoiFallback。
 */
export default function ShaderKoiBackground() {
	const reduce = useShouldReduceMotion();
	const fadeTransition = useTempoTransition(motionTransition.overlay);

	const [webGpuCapable] = useState(() => typeof navigator !== "undefined" && "gpu" in navigator);
	const [gpuUnavailable, setGpuUnavailable] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [hasMovedPointer, setHasMovedPointer] = useState(false);
	const [textures, setTextures] = useState<KoiTextures | null>(null);

	const shouldUseShader = !reduce && webGpuCapable && !gpuUnavailable;

	const handleReady = useCallback(() => {
		setIsReady(true);
	}, []);

	const handleUnavailable = useCallback(() => {
		setGpuUnavailable(true);
	}, []);

	useEffect(() => {
		if (!shouldUseShader) {
			return;
		}
		let cancelled = false;
		let loadedUrls: string[] = [];

		Promise.all([
			rasterizeSvgToPngBlobUrl(bgOnlyStatic),
			rasterizeSvgToPngBlobUrl(whiteFishStatic),
			rasterizeSvgToPngBlobUrl(blackFishStatic),
		])
			.then(([bg, whiteFish, blackFish]) => {
				loadedUrls = [bg, whiteFish, blackFish];
				if (cancelled) {
					for (const url of loadedUrls) {
						URL.revokeObjectURL(url);
					}
					return;
				}
				setTextures({ bg, whiteFish, blackFish });
			})
			.catch(() => {
				if (!cancelled) {
					setGpuUnavailable(true);
				}
			});

		return () => {
			cancelled = true;
			for (const url of loadedUrls) {
				URL.revokeObjectURL(url);
			}
		};
	}, [shouldUseShader]);

	useEffect(() => {
		if (!shouldUseShader) {
			return;
		}
		const handleFirstPointerMove = () => {
			setHasMovedPointer(true);
		};
		window.addEventListener("mousemove", handleFirstPointerMove, { once: true, passive: true });
		window.addEventListener("touchmove", handleFirstPointerMove, { once: true, passive: true });
		return () => {
			window.removeEventListener("mousemove", handleFirstPointerMove);
			window.removeEventListener("touchmove", handleFirstPointerMove);
		};
	}, [shouldUseShader]);

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={fadeTransition}
			className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none"
		>
			<StaticKoiFallback />
			{shouldUseShader && textures ? (
				<Suspense fallback={null}>
					<ShaderCanvasLayer
						textures={textures}
						hasMovedPointer={hasMovedPointer}
						isReady={isReady}
						onReady={handleReady}
						onUnavailable={handleUnavailable}
					/>
				</Suspense>
			) : null}
		</motion.div>
	);
}
