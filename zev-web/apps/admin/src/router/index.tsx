import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routes";

export const router = createRouter({ 
	routeTree,
	defaultViewTransition: true
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
	interface StaticDataRouteOption {
		title?: string;
	}
}
