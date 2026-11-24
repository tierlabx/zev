import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "zh-CN" | "en-US";

interface LocaleState {
	locale: Locale;
	setLocale: (locale: Locale) => void;
}

/**
 * 将当前语言同步至 html[lang]，确保屏幕阅读器及浏览器原生表单格式识别一致
 */
export function syncDocumentLang(locale: Locale) {
	if (typeof document !== "undefined") {
		document.documentElement.lang = locale;
	}
}

export const useLocaleStore = create<LocaleState>()(
	persist(
		(set) => ({
			locale: "zh-CN",
			setLocale: (locale) => {
				syncDocumentLang(locale);
				set({ locale });
			},
		}),
		{
			name: "locale-store",
			onRehydrateStorage: () => (state) => {
				if (state?.locale) {
					syncDocumentLang(state.locale);
				}
			},
		},
	),
);
