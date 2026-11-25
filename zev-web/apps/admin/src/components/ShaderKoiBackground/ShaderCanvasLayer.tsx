import { useEffect, useRef } from "react";
import { createKoiPondScene } from "./koi-scene";
import type { KoiPondController } from "./koi-types";

interface ShaderCanvasLayerProps {
	isReady: boolean;
	onReady: () => void;
	onUnavailable: () => void;
}

/** 检测当前浏览器是否支持 WebGL2 / WebGL 上下文 */
export function isWebGLSupported(): boolean {
	if (typeof document === "undefined") {
		return false;
	}
	try {
		const testCanvas = document.createElement("canvas");
		return Boolean(testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"));
	} catch {
		return false;
	}
}

/**
 * 独立异步加载的 Three.js 3D 黑白锦鲤水池画布层，避免将 Three.js 引擎静态打入首屏主包。
 */
export default function ShaderCanvasLayer({ isReady, onReady, onUnavailable }: ShaderCanvasLayerProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !isWebGLSupported()) {
			onUnavailable();
			return;
		}

		let controller: KoiPondController | null = null;
		let rafId = 0;
		let lastTs = performance.now();

		try {
			controller = createKoiPondScene(canvas);
			controller.render();
			onReady();
		} catch {
			onUnavailable();
			return;
		}

		const handleContextLost = (event: Event) => {
			event.preventDefault();
			if (rafId) {
				cancelAnimationFrame(rafId);
				rafId = 0;
			}
			onUnavailable();
		};
		canvas.addEventListener("webglcontextlost", handleContextLost);

		const resizeObserver = new ResizeObserver((entries) => {
			if (!controller) return;
			const entry = entries[0];
			if (entry) {
				controller.resize(entry.contentRect.width, entry.contentRect.height);
			}
		});
		resizeObserver.observe(canvas);

		const updateFromClientPoint = (clientX: number, clientY: number, target: EventTarget | null) => {
			if (!controller) return;
			const rect = canvas.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;
			const nx = (clientX - rect.left) / rect.width;
			const ny = (clientY - rect.top) / rect.height;
			const el = target instanceof Element ? target : null;
			const overCard = Boolean(el?.closest("[data-login-card]"));
			controller.setPointerNormalized(nx, ny, overCard);
		};

		const handleMouseMove = (event: MouseEvent) => {
			updateFromClientPoint(event.clientX, event.clientY, event.target);
		};

		const handlePointerDown = (event: PointerEvent) => {
			if (!controller) return;
			const el = event.target instanceof Element ? event.target : null;
			if (el?.closest("[data-login-card]")) return;
			const rect = canvas.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;
			const nx = (event.clientX - rect.left) / rect.width;
			const ny = (event.clientY - rect.top) / rect.height;
			controller.setPointerNormalized(nx, ny, false);
			controller.triggerRipple(nx, ny, 0.92);
		};

		const handleTouchMove = (event: TouchEvent) => {
			const touch = event.touches[0];
			if (touch) {
				updateFromClientPoint(touch.clientX, touch.clientY, event.target);
			}
		};

		const handleMouseLeave = () => {
			controller?.clearPointer();
		};

		window.addEventListener("mousemove", handleMouseMove, { passive: true });
		window.addEventListener("pointerdown", handlePointerDown, { passive: true });
		window.addEventListener("touchmove", handleTouchMove, { passive: true });
		document.addEventListener("mouseleave", handleMouseLeave);

		const tick = (now: number) => {
			if (!controller) return;
			const dt = (now - lastTs) / 1000;
			lastTs = now;
			controller.step(dt);
			controller.render();
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);

		return () => {
			if (rafId) {
				cancelAnimationFrame(rafId);
			}
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("touchmove", handleTouchMove);
			document.removeEventListener("mouseleave", handleMouseLeave);
			canvas.removeEventListener("webglcontextlost", handleContextLost);
			resizeObserver.disconnect();
			controller?.dispose();
			controller = null;
		};
	}, [onReady, onUnavailable]);

	return (
		<canvas
			ref={canvasRef}
			className={`absolute inset-0 w-full h-full block transition-opacity duration-500 ${isReady ? "opacity-100" : "opacity-0"}`}
		/>
	);
}
