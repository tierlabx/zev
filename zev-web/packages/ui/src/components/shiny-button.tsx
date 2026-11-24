import {
	scale as motionScale,
	ReducedMotionConfig,
	spring,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { cn } from "@zev/ui/lib/utils";
import { animate, type HTMLMotionProps, motion, useMotionTemplate, useMotionValue } from "motion/react";
import * as React from "react";

export interface ShinyButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
	children: React.ReactNode;
	className?: string;
}

const ShinyButtonInner = React.forwardRef<HTMLButtonElement, ShinyButtonProps>(
	({ children, className, ...props }, ref) => {
		const reduce = useShouldReduceMotion();
		const tapTransition = useTempoTransition(spring.press);
		const sheenPercent = useMotionValue(100);

		React.useEffect(() => {
			if (reduce) {
				sheenPercent.set(-100);
				return;
			}
			const controls = animate(sheenPercent, -100, {
				repeat: Number.POSITIVE_INFINITY,
				repeatType: "loop",
				repeatDelay: 1.4,
				duration: 1.6,
				ease: "easeInOut",
			});
			return () => controls.stop();
		}, [reduce, sheenPercent]);

		const textMask = useMotionTemplate`linear-gradient(-75deg, hsl(var(--primary)) calc(${sheenPercent}% + 20%), transparent calc(${sheenPercent}% + 30%), hsl(var(--primary)) calc(${sheenPercent}% + 100%))`;
		const borderGradient = useMotionTemplate`linear-gradient(-75deg, hsl(var(--primary) / 10%) calc(${sheenPercent}% + 20%), hsl(var(--primary) / 50%) calc(${sheenPercent}% + 25%), hsl(var(--primary) / 10%) calc(${sheenPercent}% + 100%))`;

		return (
			<motion.button
				ref={ref}
				whileTap={reduce ? undefined : { scale: motionScale.press, transition: tapTransition }}
				{...props}
				className={cn(
					"relative rounded-lg px-6 py-2 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow dark:bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/10%)_0%,transparent_60%)] dark:hover:shadow-[0_0_20px_hsl(var(--primary)/10%)]",
					className,
				)}
			>
				<motion.span
					className="inherit-text-color relative flex h-full w-full items-center justify-center gap-2 text-sm uppercase tracking-wide"
					style={reduce ? undefined : { maskImage: textMask }}
				>
					{children}
				</motion.span>
				<motion.span
					style={{
						backgroundImage: borderGradient,
						mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box, linear-gradient(rgb(0,0,0), rgb(0,0,0))",
						maskComposite: "exclude",
					}}
					className="pointer-events-none absolute inset-0 z-10 block rounded-[inherit] p-px"
				/>
			</motion.button>
		);
	},
);
ShinyButtonInner.displayName = "ShinyButtonInner";

export const ShinyButton = React.forwardRef<HTMLButtonElement, ShinyButtonProps>((props, ref) => (
	<ReducedMotionConfig>
		<ShinyButtonInner ref={ref} {...props} />
	</ReducedMotionConfig>
));
ShinyButton.displayName = "ShinyButton";
