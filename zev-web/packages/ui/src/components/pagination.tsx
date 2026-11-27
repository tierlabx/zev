"use client";

import { Root as PaginationRoot, type RootProps as PaginationRootProps } from "@animate-ui/react/primitives/pagination";
import { buttonVariants } from "@zev/ui/components/button";
import { cn } from "@zev/ui/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * 基于 Animate UI `primitives/pagination` 封装的分页容器，
 * 切页时当前页码指示器会自动以弹簧曲线滑动到目标页码。
 */
function Pagination({ className, ...props }: PaginationRootProps) {
	return (
		<PaginationRoot
			role="navigation"
			aria-label="pagination"
			data-slot="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			{...props}
		/>
	);
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
	return (
		<ul data-slot="pagination-content" className={cn("flex flex-row items-center gap-1", className)} {...props} />
	);
}

function PaginationItem({ ...props }: ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationControlStyleProps = {
	isActive?: boolean;
	size?: "default" | "sm" | "lg" | "icon";
};

function getPaginationControlClassName(isActive?: boolean, size: "default" | "sm" | "lg" | "icon" = "icon") {
	return cn(
		buttonVariants({
			variant: isActive ? "default" : "outline",
			size,
		}),
		// 极简黑白灰高对比激活态，同时保证 Animate UI 滑动指示器正确读取背景、边框与圆角
		"h-8 min-w-8 px-2 text-xs font-medium shadow-none",
		isActive
			? "border border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
			: "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
	);
}

type PaginationLinkProps = PaginationControlStyleProps & ComponentProps<"a">;

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
	return (
		<a
			aria-current={isActive ? "page" : undefined}
			data-slot="pagination-link"
			data-active={isActive ? "true" : undefined}
			className={cn(getPaginationControlClassName(isActive, size), className)}
			{...props}
		/>
	);
}

type PaginationButtonProps = PaginationControlStyleProps & ComponentProps<"button">;

function PaginationButton({ className, isActive, size = "icon", type = "button", ...props }: PaginationButtonProps) {
	return (
		<button
			type={type}
			aria-current={isActive ? "page" : undefined}
			data-slot="pagination-link"
			data-active={isActive ? "true" : undefined}
			className={cn(getPaginationControlClassName(isActive, size), "cursor-pointer", className)}
			{...props}
		/>
	);
}

function PaginationPrevious({ className, ...props }: ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			size="default"
			className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
			{...props}
		>
			<ChevronLeft className="size-4" />
		</PaginationLink>
	);
}

function PaginationNext({ className, ...props }: ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			size="default"
			className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
			{...props}
		>
			<ChevronRight className="size-4" />
		</PaginationLink>
	);
}

function PaginationEllipsis({ className, ...props }: ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn("flex size-8 items-center justify-center text-muted-foreground", className)}
			{...props}
		>
			<MoreHorizontal className="size-4" />
		</span>
	);
}

export {
	Pagination,
	PaginationButton,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
