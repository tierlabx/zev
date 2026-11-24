"use client";

import {
	blur as motionBlur,
	scale as motionScale,
	transition as motionTransition,
	ReducedMotionConfig,
	spring,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { cn } from "@zev/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	modalSize?: "sm" | "lg" | "xl";
	className?: string;
}

const TIPPED = `perspective(500px) rotateX(-20deg) scale(${motionScale.dialog})`;
const UPRIGHT = "perspective(500px) rotateX(0deg) scale(1)";

function ModalContent({ onClose, children, modalSize = "lg", className }: Omit<ModalProps, "isOpen">) {
	const reduce = useShouldReduceMotion();
	const overlayTransition = useTempoTransition(motionTransition.overlay);
	const dialogSpring = useTempoTransition(spring.dialog);
	const fadeTransition = useTempoTransition(motionTransition.dialogFade);
	const exitTransition = useTempoTransition(motionTransition.dismiss);

	const hidden = {
		opacity: 0,
		filter: motionBlur.surface,
		transform: reduce ? UPRIGHT : TIPPED,
	};
	const visible = {
		opacity: 1,
		filter: "blur(0px)",
		transform: UPRIGHT,
		transition: { ...dialogSpring, opacity: fadeTransition },
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1, transition: overlayTransition }}
			exit={{ opacity: 0, transition: overlayTransition }}
			onClick={onClose}
			className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/45 dark:bg-black/65 p-8 backdrop-blur-sm"
		>
			<motion.div
				initial={hidden}
				animate={visible}
				exit={{ ...hidden, transition: exitTransition }}
				onClick={(e) => e.stopPropagation()}
				className={cn(
					"relative w-full cursor-default overflow-hidden rounded-xl border border-border bg-card p-6 text-card-foreground shadow-2xl",
					{
						"max-w-sm": modalSize === "sm",
						"max-w-lg": modalSize === "lg",
						"max-w-xl": modalSize === "xl",
					},
					className,
				)}
			>
				{children}
			</motion.div>
		</motion.div>
	);
}

export default function Modal({ isOpen, onClose, children, modalSize = "lg", className }: ModalProps) {
	return (
		<AnimatePresence>
			{isOpen && (
				<ReducedMotionConfig>
					<ModalContent onClose={onClose} modalSize={modalSize} className={className}>
						{children}
					</ModalContent>
				</ReducedMotionConfig>
			)}
		</AnimatePresence>
	);
}
