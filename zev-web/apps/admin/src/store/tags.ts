import { create } from "zustand";

const NON_BUSINESS_PATHS = new Set(["/login", "/403", "/404"]);

function normalizeTagPath(path: string): string {
	if (!path) return "";
	return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export interface TagView {
	path: string;
	title: string;
	closable?: boolean;
}

interface TagsState {
	visitedViews: TagView[];
	addView: (view: TagView) => void;
	removeView: (path: string) => void;
	pruneViews: (allowedPaths: Set<string>) => void;
	closeOthers: (path: string) => void;
	closeAll: () => void;
	resetViews: () => void;
}

export const useTagsStore = create<TagsState>((set) => ({
	visitedViews: [],
	addView: (view) =>
		set((state) => {
			const normalizedPath = normalizeTagPath(view.path);
			if (!normalizedPath || NON_BUSINESS_PATHS.has(normalizedPath)) {
				return state;
			}
			if (state.visitedViews.some((v) => v.path === normalizedPath)) return state;
			return {
				visitedViews: [...state.visitedViews, { ...view, path: normalizedPath, closable: view.closable ?? true }],
			};
		}),
	removeView: (path) =>
		set((state) => {
			const normalizedPath = normalizeTagPath(path);
			return {
				visitedViews: state.visitedViews.filter((v) => v.path !== normalizedPath || v.closable === false),
			};
		}),
	pruneViews: (allowedPaths) =>
		set((state) => {
			const next = state.visitedViews.filter((v) => allowedPaths.has(v.path));
			if (next.length === state.visitedViews.length) {
				return state;
			}
			return { visitedViews: next };
		}),
	closeOthers: (path) =>
		set((state) => {
			const normalizedPath = normalizeTagPath(path);
			return {
				visitedViews: state.visitedViews.filter((v) => v.path === normalizedPath || v.closable === false),
			};
		}),
	closeAll: () =>
		set((state) => ({
			visitedViews: state.visitedViews.filter((v) => v.closable === false),
		})),
	resetViews: () => set({ visitedViews: [] }),
}));
