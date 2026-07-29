import {
	Book,
	FileText,
	LayoutDashboard,
	type LucideIcon,
	Settings,
	ShieldCheck,
	TreeDeciduous,
	Users,
} from "lucide-react";

/**
 * 后端菜单 icon 字段到 lucide-react 图标组件的映射表
 * 后端 seed.json 中的 icon 值需要在此映射才能正确显示
 */
const iconMap: Record<string, LucideIcon> = {
	setting: Settings,
	settings: Settings,
	user: Users,
	users: Users,
	peoples: Users,
	"tree-table": TreeDeciduous,
	dict: Book,
	dashboard: LayoutDashboard,
	home: LayoutDashboard,
	shield: ShieldCheck,
	file: FileText,
};

/**
 * 根据后端菜单 icon 字段名获取对应的 lucide-react 图标组件
 * 如果找不到映射，返回 Settings 作为默认图标
 */
export function getMenuIcon(iconName: string): LucideIcon {
	return iconMap[iconName] ?? Settings;
}
