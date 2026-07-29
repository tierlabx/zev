import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo } from "@/api/interface/system/user";

interface UserState {
	token: string | null;
	userInfo: UserInfo | null;
	permissions: string[];
	menus: UserInfo["menus"];
	setToken: (token: string) => void;
	setUserInfo: (info: UserInfo) => void;
	hasPermission: (perm: string) => boolean;
	logout: () => void;
}

export const useUserStore = create<UserState>()(
	persist(
		(set, get) => ({
			token: null,
			userInfo: null,
			permissions: [],
			menus: [],
			setToken: (token: string) => set({ token }),
			setUserInfo: (info: UserInfo) =>
				set({
					userInfo: info,
					permissions: info.permissions || [],
					menus: info.menus || [],
				}),
			hasPermission: (perm: string) => {
				const perms = get().permissions;
				if (perms.includes("*")) return true;
				return perms.includes(perm);
			},
			logout: () =>
				set({ token: null, userInfo: null, permissions: [], menus: [] }),
		}),
		{
			name: "user-store",
		},
	),
);
