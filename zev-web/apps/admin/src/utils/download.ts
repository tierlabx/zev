/**
 * 触发浏览器下载二进制 Blob 文件
 */
export function downloadBlobFile(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

/**
 * 格式化展示 JSON 字符串，解析失败时安全回退原文
 */
export function formatJsonString(raw?: string): string {
	if (!raw) {
		return "";
	}
	try {
		const parsed = JSON.parse(raw);
		return JSON.stringify(parsed, null, 2);
	} catch {
		return raw;
	}
}
