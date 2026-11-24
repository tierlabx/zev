import type { DataScopeValue } from "@/api/interface/system/role";
import type { TranslationKey } from "@/i18n";

export interface DataScopeOptionMeta {
	value: DataScopeValue;
	labelKey: TranslationKey;
	descKey: TranslationKey;
	badgeClassName: string;
}

export const DATA_SCOPE_OPTIONS: ReadonlyArray<DataScopeOptionMeta> = [
	{
		value: 1,
		labelKey: "dataScope.all",
		descKey: "dataScope.allDesc",
		badgeClassName: "bg-foreground text-background border-transparent",
	},
	{
		value: 2,
		labelKey: "dataScope.custom",
		descKey: "dataScope.customDesc",
		badgeClassName: "bg-secondary text-secondary-foreground border-border",
	},
	{
		value: 3,
		labelKey: "dataScope.dept",
		descKey: "dataScope.deptDesc",
		badgeClassName: "bg-muted text-foreground border-border",
	},
	{
		value: 4,
		labelKey: "dataScope.deptAndChild",
		descKey: "dataScope.deptAndChildDesc",
		badgeClassName: "bg-muted/80 text-foreground border-border",
	},
	{
		value: 5,
		labelKey: "dataScope.self",
		descKey: "dataScope.selfDesc",
		badgeClassName: "bg-background text-muted-foreground border-border",
	},
];

export function getDataScopeMeta(scope?: number): DataScopeOptionMeta {
	return DATA_SCOPE_OPTIONS.find((item) => item.value === scope) ?? DATA_SCOPE_OPTIONS[4];
}
