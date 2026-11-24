/**
 * 将本地/内联 SVG 资源通过离屏 2D Canvas 光栅化为 PNG Blob URL。
 * 说明：shaders@4.0.7 的 ImageTexture 仅对 `.svg` 后缀 URL 走 SVG 光栅化，
 * 而 Vite 构建会把小体积 SVG 内联为 `data:image/svg+xml`，因此需先转为标准 PNG 位图流。
 */
export function rasterizeSvgToPngBlobUrl(svgUrl: string, fallbackWidth = 2048, fallbackHeight = 1143): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			const width = img.naturalWidth || fallbackWidth;
			const height = img.naturalHeight || fallbackHeight;
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("无法创建 2D Canvas 上下文用于 SVG 光栅化"));
				return;
			}

			ctx.clearRect(0, 0, width, height);
			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob((blob) => {
				if (!blob) {
					reject(new Error(`SVG 导出 PNG Blob 失败: ${svgUrl}`));
					return;
				}
				resolve(URL.createObjectURL(blob));
			}, "image/png");
		};

		img.onerror = () => {
			reject(new Error(`SVG 加载失败: ${svgUrl}`));
		};

		img.src = svgUrl;
	});
}
