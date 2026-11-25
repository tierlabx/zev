import { AnimateIcon } from "@animate-ui/react/icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FireworksBackground } from "@zev/ui/components/animate-ui/backgrounds/fireworks";
import { GravityStarsBackground } from "@zev/ui/components/animate-ui/backgrounds/gravity-stars";
import { StarsBackground } from "@zev/ui/components/animate-ui/backgrounds/stars";
import { Activity } from "@zev/ui/components/animate-ui/icons/activity";
import { ArrowLeft } from "@zev/ui/components/animate-ui/icons/arrow-left";
import { ArrowRight } from "@zev/ui/components/animate-ui/icons/arrow-right";
import { Bell } from "@zev/ui/components/animate-ui/icons/bell";
import { BookOpen } from "@zev/ui/components/animate-ui/icons/book-open";
import { ChartLine } from "@zev/ui/components/animate-ui/icons/chart-line";
import { Download } from "@zev/ui/components/animate-ui/icons/download";
import { FileText } from "@zev/ui/components/animate-ui/icons/file-text";
import { Gauge } from "@zev/ui/components/animate-ui/icons/gauge";
import { Globe } from "@zev/ui/components/animate-ui/icons/globe";
import { House } from "@zev/ui/components/animate-ui/icons/house";
import { Layers } from "@zev/ui/components/animate-ui/icons/layers";
import { LayoutDashboard } from "@zev/ui/components/animate-ui/icons/layout-dashboard";
import { Lock } from "@zev/ui/components/animate-ui/icons/lock";
import { LogIn } from "@zev/ui/components/animate-ui/icons/log-in";
import { LogOut } from "@zev/ui/components/animate-ui/icons/log-out";
import { Mail } from "@zev/ui/components/animate-ui/icons/mail";
import { Maximize } from "@zev/ui/components/animate-ui/icons/maximize";
import { Menu } from "@zev/ui/components/animate-ui/icons/menu";
import { MessageSquare } from "@zev/ui/components/animate-ui/icons/message-square";
import { Minimize } from "@zev/ui/components/animate-ui/icons/minimize";
import { Moon } from "@zev/ui/components/animate-ui/icons/moon";
import { Plus } from "@zev/ui/components/animate-ui/icons/plus";
import { RefreshCw } from "@zev/ui/components/animate-ui/icons/refresh-cw";
import { RotateCcw } from "@zev/ui/components/animate-ui/icons/rotate-ccw";
import { Search } from "@zev/ui/components/animate-ui/icons/search";
import { Send } from "@zev/ui/components/animate-ui/icons/send";
import { Settings } from "@zev/ui/components/animate-ui/icons/settings";
import { ShieldCheck } from "@zev/ui/components/animate-ui/icons/shield-check";
import { SlidersHorizontal } from "@zev/ui/components/animate-ui/icons/sliders-horizontal";
import { Sun } from "@zev/ui/components/animate-ui/icons/sun";
import { Trash2 } from "@zev/ui/components/animate-ui/icons/trash-2";
import { User } from "@zev/ui/components/animate-ui/icons/user";
import { Users } from "@zev/ui/components/animate-ui/icons/users";

const iconGallery = [
	{ name: "activity", Icon: Activity },
	{ name: "arrow-left", Icon: ArrowLeft },
	{ name: "arrow-right", Icon: ArrowRight },
	{ name: "bell", Icon: Bell },
	{ name: "book-open", Icon: BookOpen },
	{ name: "chart-line", Icon: ChartLine },
	{ name: "download", Icon: Download },
	{ name: "file-text", Icon: FileText },
	{ name: "gauge", Icon: Gauge },
	{ name: "globe", Icon: Globe },
	{ name: "house", Icon: House },
	{ name: "layers", Icon: Layers },
	{ name: "layout-dashboard", Icon: LayoutDashboard },
	{ name: "lock", Icon: Lock },
	{ name: "log-in", Icon: LogIn },
	{ name: "log-out", Icon: LogOut },
	{ name: "mail", Icon: Mail },
	{ name: "maximize", Icon: Maximize },
	{ name: "menu", Icon: Menu },
	{ name: "message-square", Icon: MessageSquare },
	{ name: "minimize", Icon: Minimize },
	{ name: "moon", Icon: Moon },
	{ name: "plus", Icon: Plus },
	{ name: "refresh-cw", Icon: RefreshCw },
	{ name: "rotate-ccw", Icon: RotateCcw },
	{ name: "search", Icon: Search },
	{ name: "send", Icon: Send },
	{ name: "settings", Icon: Settings },
	{ name: "shield-check", Icon: ShieldCheck },
	{ name: "sliders-horizontal", Icon: SlidersHorizontal },
	{ name: "sun", Icon: Sun },
	{ name: "trash-2", Icon: Trash2 },
	{ name: "user", Icon: User },
	{ name: "users", Icon: Users },
];

const meta: Meta = {
	title: "Animate UI/Icons & Backgrounds",
};

export default meta;
type Story = StoryObj;

export const IconGallery: Story = {
	render: () => (
		<div className="grid grid-cols-3 gap-3 sm:grid-cols-6 md:grid-cols-8">
			{iconGallery.map(({ name, Icon }) => (
				<AnimateIcon key={name} animateOnHover asChild>
					<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-center hover:bg-muted/50 transition-colors cursor-pointer">
						<Icon className="h-5 w-5 text-foreground" />
						<span className="text-[11px] text-muted-foreground truncate w-full">{name}</span>
					</div>
				</AnimateIcon>
			))}
		</div>
	),
};

export const StarsParallaxBackground: Story = {
	render: () => (
		<StarsBackground className="h-72 w-full rounded-xl border border-border">
			<div className="relative z-10 flex h-72 items-center justify-center">
				<span className="rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
					移动鼠标体验星空视差效果
				</span>
			</div>
		</StarsBackground>
	),
};

export const GravityStarsInteractiveBackground: Story = {
	render: () => (
		<GravityStarsBackground
			starsCount={75}
			mouseInfluence={130}
			gravityStrength={70}
			className="h-72 w-full rounded-xl border border-border bg-slate-950 text-slate-200"
		>
			<div className="relative z-10 flex h-72 items-center justify-center">
				<span className="rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
					移动鼠标吸引周围星点
				</span>
			</div>
		</GravityStarsBackground>
	),
};

export const FireworksInteractiveBackground: Story = {
	render: () => (
		<div className="relative h-72 w-full overflow-hidden rounded-xl border border-border bg-slate-950">
			<FireworksBackground
				population={0.8}
				color={["#f8fafc", "#cbd5e1", "#94a3b8"]}
				className="absolute inset-0"
			/>
			<div className="pointer-events-none relative z-10 flex h-72 items-center justify-center">
				<span className="rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
					点击区域可触发烟花绽放
				</span>
			</div>
		</div>
	),
};
