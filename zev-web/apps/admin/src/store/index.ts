import { create } from "zustand";

interface UserState {
	token: string | null;
	userInfo: unknown | null;
	setToken: (token: string) => void;
	setUserInfo: (info: unknown) => void;
	logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
	token: localStorage.getItem("token"),
	userInfo: null,
	setToken: (token: string) => {
		localStorage.setItem("token", token);
		set({ token });
	},
	setUserInfo: (info) => set({ userInfo: info }),
	logout: () => {
		localStorage.removeItem("token");
		set({ token: null, userInfo: null });
	},
}));
