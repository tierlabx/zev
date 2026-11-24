export interface DeptQueryParams {
	keyword?: string;
	status?: number;
}

export interface DeptFormPayload {
	ID?: number;
	parent_id: number;
	name: string;
	code: string;
	leader?: string;
	phone?: string;
	email?: string;
	sort: number;
	status: number;
}
