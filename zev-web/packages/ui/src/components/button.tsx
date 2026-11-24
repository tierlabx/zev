import { Button as ButtonPrimitive } from "@animate-ui/react/primitives/buttons/button";
import { cn } from "@zev/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
				destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
				outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
				secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 rounded-md px-3 text-xs",
				lg: "h-10 rounded-md px-8",
				icon: "h-9 w-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	hoverScale?: number;
	tapScale?: number;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			children,
			// 剔除与 Motion 同名但签名冲突的原生事件属性，保证透传 HTML button props 时的类型兼容
			onDrag: _onDrag,
			onDragStart: _onDragStart,
			onDragEnd: _onDragEnd,
			onAnimationStart: _onAnimationStart,
			...props
		},
		ref,
	) => {
		const mergedClassName = cn(buttonVariants({ variant, size, className }));

		if (asChild && React.isValidElement(children)) {
			return (
				<ButtonPrimitive asChild className={mergedClassName} ref={ref} {...props}>
					{children}
				</ButtonPrimitive>
			);
		}

		return (
			<ButtonPrimitive className={mergedClassName} ref={ref} {...props}>
				{children}
			</ButtonPrimitive>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
