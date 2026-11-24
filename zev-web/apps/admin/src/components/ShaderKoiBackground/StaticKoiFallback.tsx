import bgOnlyStatic from "../../assets/bg-only.svg";
import blackFishStatic from "../../assets/black-fish.svg";
import whiteFishStatic from "../../assets/white-fish.svg";

/**
 * 非 WebGPU 环境或开启“减弱动态效果”时的静态太极双鱼兜底背景。
 * 按 Three.js 场景中 1.5× 视口平面与 0.5× 鱼体缩放的比例静态复刻静止帧构图。
 */
export function StaticKoiFallback() {
	return (
		<div aria-hidden="true" className="absolute inset-0 overflow-hidden select-none pointer-events-none">
			<img
				src={bgOnlyStatic}
				alt=""
				className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] max-w-none object-fill"
			/>
			<img
				src={whiteFishStatic}
				alt=""
				className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] max-w-none object-fill"
			/>
			<img
				src={blackFishStatic}
				alt=""
				className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] max-w-none object-fill"
			/>
		</div>
	);
}
