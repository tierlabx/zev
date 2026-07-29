import { create } from "zustand";

export interface TagView {
	path: string;
	title: string;
	closable?: boolean;
}

interface TagsState {
	visitedViews: TagView[];
	addView: (view: TagView) => void;
	removeView: (path: string) => void;
	closeOthers: (path: string) => void;
	closeAll: () => void;
}

export const useTagsStore = create<TagsState>((set) => ({
	visitedViews: [],
	addView: (view) =>
		set((state) => {
			if (state.visitedViews.some((v) => v.path === view.path)) return state;
			return { visitedViews: [...state.visitedViews, { ...view, closable: view.closable ?? true }] };
		}),
	removeView: (path) =>
		set((state) => ({
			visitedViews: state.visitedViews.filter((v) => v.path !== path || v.closable === false),
		})),
	closeOthers: (path) =>
		set((state) => ({
			visitedViews: state.visitedViews.filter((v) => v.path === path || v.closable === false),
		})),
	closeAll: () =>
		set((state) => ({
			visitedViews: state.visitedViews.filter((v) => v.closable === false),
		})),
}));
