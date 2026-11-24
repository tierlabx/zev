export interface TreeNodeBase {
	ID: number;
}

export type FlattenedTreeNode<T extends TreeNodeBase> = T & {
	level: number;
	hasChildren: boolean;
};

/**
 * 将树形结构按当前展开集合扁平化，供树形表格和缩进选择器复用
 */
export function flattenTreeWithLevel<T extends TreeNodeBase & { children?: T[] }>(
	nodes: T[],
	expandedIds?: Set<number>,
	level = 0,
): FlattenedTreeNode<T>[] {
	const result: FlattenedTreeNode<T>[] = [];
	for (const node of nodes) {
		const children = node.children ?? [];
		const hasChildren = children.length > 0;
		result.push({
			...node,
			level,
			hasChildren,
		});
		const shouldExpand = expandedIds === undefined || expandedIds.has(node.ID);
		if (hasChildren && shouldExpand) {
			result.push(...flattenTreeWithLevel(children, expandedIds, level + 1));
		}
	}
	return result;
}

/**
 * 收集树中所有节点的 ID
 */
export function collectAllNodeIds<T extends TreeNodeBase & { children?: T[] }>(nodes: T[]): number[] {
	const ids: number[] = [];
	for (const node of nodes) {
		ids.push(node.ID);
		if (node.children && node.children.length > 0) {
			ids.push(...collectAllNodeIds(node.children));
		}
	}
	return ids;
}

/**
 * 收集目标节点自身及其所有子孙节点 ID（如编辑上级部门时屏蔽自循环选项）
 */
export function collectDescendantIds<T extends TreeNodeBase & { children?: T[] }>(
	nodes: T[],
	targetId: number,
): Set<number> {
	const result = new Set<number>();

	const collectSubtree = (node: T) => {
		result.add(node.ID);
		if (node.children) {
			for (const child of node.children) {
				collectSubtree(child);
			}
		}
	};

	const findTarget = (list: T[]): boolean => {
		for (const node of list) {
			if (node.ID === targetId) {
				collectSubtree(node);
				return true;
			}
			if (node.children && findTarget(node.children)) {
				return true;
			}
		}
		return false;
	};

	findTarget(nodes);
	return result;
}

/**
 * 按关键词过滤树形结构：保留匹配节点及通往匹配节点的祖先路径
 */
export function filterTreeByKeyword<T extends TreeNodeBase & { children?: T[] }>(
	nodes: T[],
	keyword: string,
	predicate: (node: T, normalizedKeyword: string) => boolean,
): T[] {
	const kw = keyword.trim().toLowerCase();
	if (!kw) return nodes;

	const filtered: T[] = [];
	for (const node of nodes) {
		const matchedChildren = node.children ? filterTreeByKeyword(node.children, kw, predicate) : [];
		if (predicate(node, kw) || matchedChildren.length > 0) {
			filtered.push({
				...node,
				children: matchedChildren,
			});
		}
	}
	return filtered;
}

/**
 * 递归切换树节点选中状态，可选父子联动勾选与祖先全选自动同步
 */
export function toggleTreeSelection<T extends TreeNodeBase & { children?: T[] }>(
	nodes: T[],
	selected: Set<number>,
	targetId: number,
	checked: boolean,
	cascade: boolean,
): Set<number> {
	const next = new Set(selected);

	if (!cascade) {
		if (checked) {
			next.add(targetId);
		} else {
			next.delete(targetId);
		}
		return next;
	}

	const descendants = collectDescendantIds(nodes, targetId);
	for (const id of descendants) {
		if (checked) {
			next.add(id);
		} else {
			next.delete(id);
		}
	}

	// 启用联动时向上同步父节点状态：子节点全选则选中父节点，否则取消父节点全选
	const syncAncestors = (list: T[]): boolean => {
		let allSelected = true;
		for (const node of list) {
			if (node.children && node.children.length > 0) {
				const childrenAllSelected = syncAncestors(node.children);
				if (childrenAllSelected) {
					next.add(node.ID);
				} else if (!checked) {
					next.delete(node.ID);
				}
			}
			if (!next.has(node.ID)) {
				allSelected = false;
			}
		}
		return allSelected;
	};

	syncAncestors(nodes);
	return next;
}
