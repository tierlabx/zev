export interface Menu {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	parent_id: number;
	name: string;
	path: string;
	component: string;
	icon: string;
	sort: number;
	type: string;
	perms: string;
	children?: Menu[];
}
