import type { Column } from "@tanstack/react-table";
import type React from "react";

export const getPinningStyles = <TData, TValue>(column: Column<TData, TValue>): React.CSSProperties => {
	const isPinned = column.getIsPinned();
	const isLastLeftPinnedColumn = isPinned === "left" && column.getIsLastColumn("left");
	const isFirstRightPinnedColumn = isPinned === "right" && column.getIsFirstColumn("right");

	return {
		boxShadow: isLastLeftPinnedColumn
			? "inset -4px 0 4px -4px rgba(0, 0, 0, 0.1)"
			: isFirstRightPinnedColumn
				? "inset 4px 0 4px -4px rgba(0, 0, 0, 0.1)"
				: undefined,
		left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
		right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
		position: isPinned ? "sticky" : "relative",
		width: column.getSize(),
		zIndex: isPinned ? 2 : 0,
		backgroundColor: isPinned ? "inherit" : undefined,
	};
};
