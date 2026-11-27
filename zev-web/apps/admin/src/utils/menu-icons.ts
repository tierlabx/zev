import { Activity } from "@zev/ui/components/animate-ui/icons/activity";
import { Bell } from "@zev/ui/components/animate-ui/icons/bell";
import { BookOpen } from "@zev/ui/components/animate-ui/icons/book-open";
import { FileText } from "@zev/ui/components/animate-ui/icons/file-text";
import { Layers } from "@zev/ui/components/animate-ui/icons/layers";
import { LayoutDashboard } from "@zev/ui/components/animate-ui/icons/layout-dashboard";
import { LogIn } from "@zev/ui/components/animate-ui/icons/log-in";
import { Mail } from "@zev/ui/components/animate-ui/icons/mail";
import { MessageSquare } from "@zev/ui/components/animate-ui/icons/message-square";
import { Settings } from "@zev/ui/components/animate-ui/icons/settings";
import { ShieldCheck } from "@zev/ui/components/animate-ui/icons/shield-check";
import { Users } from "@zev/ui/components/animate-ui/icons/users";
import { Bot, Building2, Cpu, Database, FlaskConical, Sparkles, Terminal } from "lucide-react";
import type { ComponentType } from "react";

/**
 * 菜单图标组件类型：
 * Animate UI 动画图标与 lucide 静态图标都只依赖 className，
 * 统一成同一签名后，侧边栏无需关心图标是否可动画。
 */
export type MenuIcon = ComponentType<{ className?: string }>;

/**
 * 后端菜单 icon 字段到图标组件的映射表
 * 优先使用 Animate UI 动画图标（父级 AnimateIcon 悬停时播放）；
 * 注册表暂未提供的图标（building / database）回退为 lucide 静态图标。
 * 后端 seed.json 中的 icon 值需要在此映射才能正确显示
 */
const iconMap: Record<string, MenuIcon> = {
	setting: Settings,
	settings: Settings,
	user: Users,
	users: Users,
	peoples: Users,
	"tree-table": Layers,
	bell: Bell,
	building: Building2,
	database: Database,
	dict: BookOpen,
	mail: Mail,
	"message-square": MessageSquare,
	"scroll-text": FileText,
	"log-in": LogIn,
	dashboard: LayoutDashboard,
	home: LayoutDashboard,
	shield: ShieldCheck,
	file: FileText,
	bot: Bot,
	cpu: Cpu,
	layers: Layers,
	terminal: Terminal,
	activity: Activity,
	flask: FlaskConical,
	sparkles: Sparkles,
};

/**
 * 可选菜单图标选项清单（供菜单配置图标选择器可视化展示）
 */
export interface MenuIconOption {
	name: string;
	icon: MenuIcon;
}

export const MENU_ICON_OPTIONS: readonly MenuIconOption[] = [
	{ name: "dashboard", icon: LayoutDashboard },
	{ name: "sparkles", icon: Sparkles },
	{ name: "bot", icon: Bot },
	{ name: "cpu", icon: Cpu },
	{ name: "layers", icon: Layers },
	{ name: "terminal", icon: Terminal },
	{ name: "activity", icon: Activity },
	{ name: "flask", icon: FlaskConical },
	{ name: "setting", icon: Settings },
	{ name: "user", icon: Users },
	{ name: "shield", icon: ShieldCheck },
	{ name: "building", icon: Building2 },
	{ name: "dict", icon: BookOpen },
	{ name: "bell", icon: Bell },
	{ name: "mail", icon: Mail },
	{ name: "message-square", icon: MessageSquare },
	{ name: "scroll-text", icon: FileText },
	{ name: "log-in", icon: LogIn },
	{ name: "database", icon: Database },
];

/**
 * 根据后端菜单 icon 字段名获取对应的图标组件
 * 如果找不到映射，返回 Settings 作为默认图标
 */
export function getMenuIcon(iconName: string): MenuIcon {
	return iconMap[iconName] ?? Settings;
}
