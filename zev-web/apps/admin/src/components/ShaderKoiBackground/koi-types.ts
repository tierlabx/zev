import type * as THREE from "three";

/**
 * 锦鲤配色变体：白瓷素墨（white）与玄墨银脊（black）
 */
export type KoiVariant = "white" | "black";

/**
 * 鼠标或脚本驱动的交互目标状态（世界坐标）
 */
export interface PointerTarget {
	x: number;
	y: number;
	active: boolean;
	overCard: boolean;
	lastMoveTime: number;
}

/**
 * 3D 锦鲤池场景初始化选项
 */
export interface KoiSceneOptions {
	/** 可选外部传入的 WebGLRenderer 实例（用于无头宿主或自定义渲染器接管） */
	renderer?: THREE.WebGLRenderer;
	/** 初始宽高比，未传时从 canvas 尺寸推导 */
	aspect?: number;
	/** 渲染像素比上限，默认取 min(devicePixelRatio, 2) */
	pixelRatio?: number;
	/** 初始模拟时间（秒），用于确定性渲染或预览起步 */
	initialTime?: number;
	/** 离线渲染或自动化测试时注入虚拟指针轨迹 */
	scriptedPointer?: (elapsedSeconds: number) => {
		nx: number;
		ny: number;
		active: boolean;
		overCard?: boolean;
		rippleStrength?: number;
	};
}

/**
 * 3D 锦鲤池运行时控制器接口（同时兼容浏览器实时循环与 raea 离线帧渲染）
 */
export interface KoiPondController {
	/** 推进模拟步长（秒）并更新骨骼、水流与相机状态 */
	step: (dt: number) => void;
	/** 执行一帧 Three.js 渲染 */
	render: () => void;
	/** 更新画布尺寸与相机投影 */
	resize: (width: number, height: number) => void;
	/** 以归一化屏幕坐标 (0..1, 左上角为原点) 更新鼠标追随目标 */
	setPointerNormalized: (nx: number, ny: number, overCard: boolean) => void;
	/** 鼠标离开视口时清除追随目标 */
	clearPointer: () => void;
	/** 在归一化屏幕坐标处主动激起水面涟漪 */
	triggerRipple: (nx: number, ny: number, strength?: number) => void;
	/** 释放所有 GPU 几何体、材质与渲染器资源 */
	dispose: () => void;
}
