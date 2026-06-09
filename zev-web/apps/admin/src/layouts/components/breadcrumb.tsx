import {
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	Breadcrumb as BreadcrumbRoot,
	BreadcrumbSeparator,
} from "@zev/ui/components/breadcrumb";
import { Fragment } from "react";
import { useLocation } from "react-router-dom";

const routeMap: Record<string, string> = {
	"/dashboard": "Dashboard",
	"/users": "User Management",
};

export function Breadcrumb() {
	const location = useLocation();
	const pathnames = location.pathname.split("/").filter((x) => x);

	return (
		<BreadcrumbRoot>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
				</BreadcrumbItem>
				{pathnames.length > 0 && <BreadcrumbSeparator />}
				{pathnames.map((value, index) => {
					const to = `/${pathnames.slice(0, index + 1).join("/")}`;
					const isLast = index === pathnames.length - 1;
					const title = routeMap[to] || value;

					return (
						<Fragment key={to}>
							<BreadcrumbItem>
								{isLast ? <BreadcrumbPage>{title}</BreadcrumbPage> : <BreadcrumbLink href={to}>{title}</BreadcrumbLink>}
							</BreadcrumbItem>
							{!isLast && <BreadcrumbSeparator />}
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</BreadcrumbRoot>
	);
}
