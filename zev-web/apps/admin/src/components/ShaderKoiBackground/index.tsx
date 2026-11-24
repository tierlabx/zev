import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { CustomShader, ImageTexture, isWebGPUSupported, Shader } from "shaders/react";
import { rasterizeSvgToPngBlobUrl } from "@/utils/svg-texture";
import bgOnlyStatic from "../../assets/bg-only.svg";
import blackFishStatic from "../../assets/black-fish.svg";
import whiteFishStatic from "../../assets/white-fish.svg";
import { StaticKoiFallback } from "./StaticKoiFallback";
import { koiFishShader, koiWaterBgShader } from "./shaders";

interface KoiTextures {
	bg: string;
	whiteFish: string;
	blackFish: string;
}

const STATIC_CENTER = { x: 0.5, y: 0.5 };
const MOUSE_RIPPLE_DRIVER = { type: "mouse-position" as const, smoothing: 0.72, momentum: 0 };
const CAMERA_PARALLAX_DRIVER = { type: "mouse-position" as const, smoothing: 0.86, momentum: 0 };

/**
 * 基于 WebGPU（shaders@4.0.7 + 自定义 WGSL）的太极双鱼动态登录页背景。
 * 不支持 WebGPU、设备初始化失败或用户开启“减弱动态效果”时，无缝展示 StaticKoiFallback 静态背景。
 */
export default function ShaderKoiBackground() {
	const reduce = useShouldReduceMotion();
	const fadeTransition = useTempoTransition(motionTransition.overlay);

	const [webGpuCapable] = useState(() => (typeof window !== "undefined" ? isWebGPUSupported() : false));
	const [gpuUnavailable, setGpuUnavailable] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [hasMovedPointer, setHasMovedPointer] = useState(false);
	const [textures, setTextures] = useState<KoiTextures | null>(null);

	const shouldUseShader = !reduce && webGpuCapable && !gpuUnavailable;

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

	const mouseProp = hasMovedPointer ? MOUSE_RIPPLE_DRIVER : STATIC_CENTER;
	const cameraProp = hasMovedPointer ? CAMERA_PARALLAX_DRIVER : STATIC_CENTER;

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={fadeTransition}
			className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none"
		>
			<StaticKoiFallback />
			{shouldUseShader && textures ? (
				<Shader
					disableTelemetry
					colorSpace="srgb"
					toneMapping="linear"
					onReady={() => setIsReady(true)}
					onUnavailable={() => setGpuUnavailable(true)}
					className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isReady ? "opacity-100" : "opacity-0"}`}
				>
					<CustomShader src={koiWaterBgShader} mouse={mouseProp} cameraMouse={cameraProp}>
						<ImageTexture url={textures.bg} objectFit="fill" />
					</CustomShader>

					<CustomShader
						src={koiFishShader}
						blendMode="normal"
						mouse={mouseProp}
						cameraMouse={cameraProp}
						layerZ={0.1}
						pivotX={0.41}
						pivotY={0.65}
					>
						<ImageTexture url={textures.whiteFish} objectFit="fill" />
					</CustomShader>

					<CustomShader
						src={koiFishShader}
						blendMode="normal"
						mouse={mouseProp}
						cameraMouse={cameraProp}
						layerZ={0.2}
						pivotX={0.57}
						pivotY={0.34}
					>
						<ImageTexture url={textures.blackFish} objectFit="fill" />
					</CustomShader>
				</Shader>
			) : null}
		</motion.div>
	);
}
