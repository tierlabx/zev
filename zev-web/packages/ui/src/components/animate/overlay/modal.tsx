"use client";

import { cn } from "@zev/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import React from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	modalSize?: "sm" | "lg" | "xl";
	className?: string;
}

export default function Modal({ isOpen, onClose, children, modalSize = "lg", className }: ModalProps) {
	return (
		<AnimatePresence>
			{isOpen && (
				<div
					onClick={onClose}
					className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/40 dark:bg-black/65 p-8 backdrop-blur"
				>
					<motion.div
						initial={{ scale: 0, rotate: "180deg" }}
						animate={{
							scale: 1,
							rotate: "0deg",
							transition: {
								type: "spring",
								bounce: 0.25,
							},
						}}
						exit={{ scale: 0, rotate: "180deg" }}
						onClick={(e) => e.stopPropagation()}
						className={cn(
							"relative w-full cursor-default overflow-hidden rounded-xl bg-card p-6 text-card-foreground shadow-2xl border border-border",
							{
								"max-w-sm": modalSize === "sm",
								"max-w-lg": modalSize === "lg",
								"max-w-xl": modalSize === "xl",
							},
							className
						)}
					>
						{children}
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}
