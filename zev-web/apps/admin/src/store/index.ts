import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
	token: string | null;
	userInfo: unknown | null;
	setToken: (token: string) => void;
	setUserInfo: (info: unknown) => void;
	logout: () => void;
}

export const useUserStore = create<UserState>()(
	persist(
		(set) => ({
			token: null,
			userInfo: null,
			setToken: (token: string) => set({ token }),
			setUserInfo: (info) => set({ userInfo: info }),
			logout: () => set({ token: null, userInfo: null }),
		}),
		{
			name: "user-store",
		}
	)
);
