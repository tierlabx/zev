import type { Column } from "@tanstack/react-table";
import type React from "react";

export const getPinningStyles = <TData, TValue>(column: Column<TData, TValue>): React.CSSProperties => {
	const isPinned = column.getIsPinned();
	const isLastLeftPinnedColumn = isPinned === "left" && column.getIsLastColumn("left");
	const isFirstRightPinnedColumn = isPinned === "right" && column.getIsFirstColumn("right");

	return {
		boxShadow: isLastLeftPinnedColumn
			? "inset -1px 0 0 0 var(--color-border), inset -4px 0 6px -4px rgba(0, 0, 0, 0.14)"
			: isFirstRightPinnedColumn
				? "inset 1px 0 0 0 var(--color-border), inset 4px 0 6px -4px rgba(0, 0, 0, 0.14)"
				: undefined,
		left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
		right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
		position: isPinned ? "sticky" : "relative",
		width: column.getSize(),
		zIndex: isPinned ? 2 : 0,
	};
};
