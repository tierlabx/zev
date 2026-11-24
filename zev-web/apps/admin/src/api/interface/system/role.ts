/**
 * 数据权限范围枚举值：
 * 1-全部 2-自定义 3-本部门 4-本部门及以下 5-仅本人
 */
export type DataScopeValue = 1 | 2 | 3 | 4 | 5;

export interface Role {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	name: string;
	code: string;
	status: number;
	sort: number;
	desc: string;
	data_scope: DataScopeValue | number;
}

export interface RoleDataScope {
	role_id: number;
	data_scope: DataScopeValue | number;
	dept_ids: number[];
}
