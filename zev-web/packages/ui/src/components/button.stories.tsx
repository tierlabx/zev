import { AnimateIcon } from "@animate-ui/react/icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "@zev/ui/components/animate-ui/icons/plus";
import { Send } from "@zev/ui/components/animate-ui/icons/send";
import { Trash2 } from "@zev/ui/components/animate-ui/icons/trash-2";
import { Button } from "@zev/ui/components/button";

const meta: Meta<typeof Button> = {
	title: "UI/Button",
	component: Button,
	args: {
		children: "按钮操作",
		variant: "default",
		size: "default",
		disabled: false,
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
		},
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-3">
			<Button variant="default">Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="link">Link</Button>
			<Button disabled>Disabled</Button>
		</div>
	),
};

export const WithAnimatedIcons: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-3">
			<AnimateIcon animateOnHover asChild>
				<Button>
					<Plus className="h-4 w-4" />
					新增记录
				</Button>
			</AnimateIcon>
			<AnimateIcon animateOnHover asChild>
				<Button variant="outline">
					<Send className="h-4 w-4" />
					立即发送
				</Button>
			</AnimateIcon>
			<AnimateIcon animateOnHover asChild>
				<Button variant="destructive" size="icon" aria-label="删除">
					<Trash2 className="h-4 w-4" />
				</Button>
			</AnimateIcon>
		</div>
	),
};
