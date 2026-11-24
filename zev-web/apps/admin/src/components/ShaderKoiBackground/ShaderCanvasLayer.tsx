import { useEffect } from "react";
import { CustomShader, ImageTexture, isWebGPUSupported, Shader } from "shaders/react";
import { koiFishShader, koiWaterBgShader } from "./shaders";

export interface KoiTextures {
	bg: string;
	whiteFish: string;
	blackFish: string;
}

interface ShaderCanvasLayerProps {
	textures: KoiTextures;
	hasMovedPointer: boolean;
	isReady: boolean;
	onReady: () => void;
	onUnavailable: () => void;
}

const STATIC_CENTER = { x: 0.5, y: 0.5 };
const MOUSE_RIPPLE_DRIVER = { type: "mouse-position" as const, smoothing: 0.72, momentum: 0 };
const CAMERA_PARALLAX_DRIVER = { type: "mouse-position" as const, smoothing: 0.86, momentum: 0 };

/**
 * 独立异步加载的 WebGPU 着色器画布层，避免将全量 `shaders` 引擎静态打入首屏主包。
 */
export default function ShaderCanvasLayer({
	textures,
	hasMovedPointer,
	isReady,
	onReady,
	onUnavailable,
}: ShaderCanvasLayerProps) {
	const webGpuSupported = isWebGPUSupported();

	useEffect(() => {
		if (!webGpuSupported) {
			onUnavailable();
		}
	}, [webGpuSupported, onUnavailable]);

	if (!webGpuSupported) {
		return null;
	}

	const mouseProp = hasMovedPointer ? MOUSE_RIPPLE_DRIVER : STATIC_CENTER;
	const cameraProp = hasMovedPointer ? CAMERA_PARALLAX_DRIVER : STATIC_CENTER;

	return (
		<Shader
			disableTelemetry
			colorSpace="srgb"
			toneMapping="linear"
			onReady={onReady}
			onUnavailable={onUnavailable}
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
	);
}
