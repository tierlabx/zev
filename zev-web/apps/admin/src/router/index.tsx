import { createBrowserRouter, Outlet } from "react-router-dom";
import App from "@/App";
import { routes } from "./routes";

export const router = createBrowserRouter([
	{
		Component: () => (
			<App>
				<Outlet />
			</App>
		),
		children: routes,
	},
]);
