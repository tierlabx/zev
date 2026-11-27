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
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.defaultPrevented) {
				onCloseRef.current();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

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
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
			className="fixed inset-0 z-50 flex cursor-pointer items-start justify-center overflow-y-auto bg-black/45 dark:bg-black/65 p-4 sm:p-6 backdrop-blur-sm"
		>
			<motion.div
				initial={hidden}
				animate={visible}
				exit={{ ...hidden, transition: exitTransition }}
				onClick={(e) => e.stopPropagation()}
				className={cn(
					"relative my-auto w-full cursor-default rounded-xl border border-border bg-card p-6 text-card-foreground shadow-2xl",
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
	if (typeof document === "undefined") return null;

	// 通过 Portal 挂载到 document.body，避免被带 transform/overflow-hidden 的布局容器裁切遮挡
	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<ReducedMotionConfig>
					<ModalContent onClose={onClose} modalSize={modalSize} className={className}>
						{children}
					</ModalContent>
				</ReducedMotionConfig>
			)}
		</AnimatePresence>,
		document.body,
	);
}
