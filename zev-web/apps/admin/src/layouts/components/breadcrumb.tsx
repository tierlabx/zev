import { Link, useMatches } from "@tanstack/react-router";
import {
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	Breadcrumb as BreadcrumbRoot,
	BreadcrumbSeparator,
} from "@zev/ui/components/breadcrumb";
import { Fragment } from "react";

export function Breadcrumb() {
	const matches = useMatches();

	// 过滤出所有包含 title 的有效路由节点
	const breadcrumbs = matches
		.filter((match) => match.staticData?.title)
		.map((match) => ({
			title: match.staticData.title as string,
			path: match.pathname,
		}));

	// 过滤掉可能存在的路径重复（在某些 layout 和 index 路由结构中可能出现）
	const uniqueBreadcrumbs = Array.from(new Map(breadcrumbs.map((item) => [item.path, item])).values());

	// 如果没有任何匹配的面包屑，提供一个默认占位
	if (uniqueBreadcrumbs.length === 0) {
		return (
			<BreadcrumbRoot>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbPage>页面</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</BreadcrumbRoot>
		);
	}

	return (
		<BreadcrumbRoot>
			<BreadcrumbList>
				{uniqueBreadcrumbs.map((crumb, index) => {
					const isLast = index === uniqueBreadcrumbs.length - 1;

					return (
						<Fragment key={crumb.path}>
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage>{crumb.title}</BreadcrumbPage>
								) : (
									<Link to={crumb.path} className="transition-colors hover:text-foreground">
										{crumb.title}
									</Link>
								)}
							</BreadcrumbItem>
							{!isLast && <BreadcrumbSeparator />}
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</BreadcrumbRoot>
	);
}
