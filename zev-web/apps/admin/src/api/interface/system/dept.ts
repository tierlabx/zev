export interface Dept {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	parent_id: number;
	ancestors: string;
	name: string;
	code: string;
	leader: string;
	phone: string;
	email: string;
	sort: number;
	status: number;
}

export interface DeptTreeNode extends Dept {
	children: DeptTreeNode[];
}
