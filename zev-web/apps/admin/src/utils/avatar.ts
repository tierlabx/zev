/**
 * 根据用户昵称或用户名生成头像首字母占位文本
 * 中文名取首个汉字，避免 28px 小头像内出现双字拥挤及与右侧昵称语义重复；
 * 英文多词取前两词首字母大写，单词取前两个字符大写。
 */
export function getAvatarInitials(name?: string | null): string {
	const trimmed = name?.trim() ?? "";
	if (!trimmed) {
		return "U";
	}
	if (/[\u4e00-\u9fff]/.test(trimmed)) {
		return trimmed.slice(0, 1);
	}
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
	}
	return trimmed.slice(0, 2).toUpperCase();
}
