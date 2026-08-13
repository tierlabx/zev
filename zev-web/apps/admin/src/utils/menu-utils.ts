import type { MenuItem } from "@/api/interface/system/user";

/**
 * 规范化路由路径：确保以 / 开头
 */
export function normalizePath(path: string): string {
	if (!path) return "/";
	return path.startsWith("/") ? path : `/${path}`;
}

/**
 * 拼接父子路径
 */
export function joinPath(parent: string, child: string): string {
	return `${parent}${normalizePath(child)}`.replace(/\/+/g, "/");
}

/**
 * 在菜单树中深度优先查找第一个 C 类型（页面）菜单的完整路径
 *
 * 用于：
 * - tags-view 的初始标签和关闭标签后的回退导航
 * - NotFound 页面的"回到首页"按钮
 * - 任何需要"第一个可用页面"的场景
 */
export function findFirstPagePath(menus: MenuItem[], parentPath = ""): string | null {
	const sorted = [...menus].filter((m) => m.type === "M" || m.type === "C").sort((a, b) => a.sort - b.sort);

	for (const menu of sorted) {
		const fullPath = joinPath(parentPath, menu.path);

		if (menu.type === "C") {
			return fullPath;
		}
		if (menu.type === "M" && menu.children?.length) {
			const childPath = findFirstPagePath(menu.children, fullPath);
			if (childPath) return childPath;
		}
	}
	return null;
}

/**
 * 递归扁平化菜单树，只提取类型为 C（页面组件）的菜单项用于搜索
 */
export function flattenMenus(menus: MenuItem[], parentPath = ""): { name: string; path: string }[] {
	let result: { name: string; path: string }[] = [];
	for (const menu of menus) {
		const fullPath = menu.path.startsWith("/") ? menu.path : `${parentPath}/${menu.path}`.replace(/\/+/g, "/");
		if (menu.type === "C") {
			result.push({ name: menu.name, path: fullPath });
		}
		if (menu.children && menu.children.length > 0) {
			result = result.concat(flattenMenus(menu.children, fullPath));
		}
	}
	return result;
}
