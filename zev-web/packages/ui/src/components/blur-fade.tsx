import {
	transition as motionTransition,
	ReducedMotionConfig,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { cn } from "@zev/ui/lib/utils";
import { AnimatePresence, motion, type UseInViewOptions, useInView } from "motion/react";
import * as React from "react";

interface BlurFadeProps {
	children: React.ReactNode;
	className?: string;
	variant?: {
		hidden: { y: number; opacity?: number; filter?: string };
		visible: { y: number; opacity?: number; filter?: string };
	};
	duration?: number;
	delay?: number;
	yOffset?: number;
	inView?: boolean;
	inViewMargin?: UseInViewOptions["margin"];
	blur?: string;
}

function BlurFadeInner({
	children,
	className,
	variant,
	duration,
	delay = 0,
	yOffset = 6,
	inView = false,
	inViewMargin = "-50px",
	blur = "6px",
}: BlurFadeProps) {
	const ref = React.useRef<HTMLDivElement>(null);
	const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
	const isInView = !inView || inViewResult;
	const reduce = useShouldReduceMotion();
	const revealTransition = useTempoTransition({
		...motionTransition.reveal,
		...(duration !== undefined ? { duration } : {}),
		delay: 0.04 + delay,
	});

	const defaultVariants = reduce
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1 },
			}
		: {
				hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
				visible: { y: 0, opacity: 1, filter: "blur(0px)" },
			};
	const combinedVariants = variant || defaultVariants;

	return (
		<AnimatePresence>
			<motion.div
				ref={ref}
				initial="hidden"
				animate={isInView ? "visible" : "hidden"}
				exit="hidden"
				variants={combinedVariants}
				transition={revealTransition}
				className={cn(className)}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}

export function BlurFade(props: BlurFadeProps) {
	return (
		<ReducedMotionConfig>
			<BlurFadeInner {...props} />
		</ReducedMotionConfig>
	);
}
