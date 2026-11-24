import { useCallback } from "react";
import { enUS } from "@/locales/en-US";
import { zhCN } from "@/locales/zh-CN";
import { type Locale, useLocaleStore } from "@/store/locale";

export type TranslationMessages = Omit<typeof zhCN, "routes">;

type DotPaths<T> = {
	[K in keyof T & string]: T[K] extends string
		? K
		: T[K] extends Record<string, string>
			? `${K}.${keyof T[K] & string}`
			: never;
}[keyof T & string];

export type TranslationKey = DotPaths<TranslationMessages>;
export type TranslationParams = Record<string, string | number>;

export const LOCALE_OPTIONS: ReadonlyArray<{ value: Locale; label: string }> = [
	{ value: "zh-CN", label: "简体中文" },
	{ value: "en-US", label: "English" },
];

const dictionaries = {
	"zh-CN": zhCN,
	"en-US": enUS,
} as const;

type NestedDictionary = Record<string, Record<string, string>>;

function formatMessage(template: string, params?: TranslationParams): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (match, key: string) => {
		return key in params ? String(params[key]) : match;
	});
}

/**
 * 按点号路径读取指定语言的翻译文案；缺失时回退到简体中文
 */
export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
	const [namespace, field] = key.split(".") as [string, string];
	const activeDict = dictionaries[locale] as NestedDictionary;
	const fallbackDict = dictionaries["zh-CN"] as NestedDictionary;
	const template = activeDict[namespace]?.[field] ?? fallbackDict[namespace]?.[field] ?? key;
	return formatMessage(template, params);
}

/**
 * 命令式翻译函数，供请求拦截器等非 React 组件场景调用
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
	return translate(useLocaleStore.getState().locale, key, params);
}

/**
 * 根据路由路径映射预置菜单与路由标题；自定义菜单自动回退到后端原始名称
 */
export function translateMenuTitle(
	path: string,
	fallback: string,
	locale: Locale = useLocaleStore.getState().locale,
): string {
	const normalizedPath = path.length > 1 ? path.replace(/\/+$/, "") : path;
	const routeMap: Record<string, string> = dictionaries[locale].routes;
	return routeMap[normalizedPath] ?? fallback;
}

/**
 * 国际化 Hook：订阅当前语言并在切换时提供稳定的翻译回调
 */
export function useI18n() {
	const locale = useLocaleStore((state) => state.locale);
	const setLocale = useLocaleStore((state) => state.setLocale);

	const translateWithLocale = useCallback(
		(key: TranslationKey, params?: TranslationParams) => translate(locale, key, params),
		[locale],
	);

	const translateMenu = useCallback(
		(path: string, fallback: string) => translateMenuTitle(path, fallback, locale),
		[locale],
	);

	return {
		locale,
		setLocale,
		t: translateWithLocale,
		translateMenu,
	};
}
