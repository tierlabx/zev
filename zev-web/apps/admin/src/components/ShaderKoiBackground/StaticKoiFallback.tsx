/**
 * 非 WebGL 环境或开启“减弱动态效果”时的极简黑白水墨兜底背景（纯 CSS 零 SVG 依赖）。
 * 复刻从左下扫向右上角的安全黑白对角构图，确保右侧登录卡片完全落于明亮白区。
 */
export function StaticKoiFallback() {
	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 overflow-hidden select-none pointer-events-none"
			style={{
				background:
					"linear-gradient(142deg, #040507 0%, #0b0d11 45%, #232730 48.2%, #e6e8ec 49.4%, #f4f5f7 56%, #eceef1 100%)",
			}}
		/>
	);
}
