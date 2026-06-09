import { Outlet } from "react-router-dom";

export function Main() {
	return (
		<main className="flex-1 flex flex-col">
			<div className="flex-1 p-[48px] overflow-auto">
				<Outlet />
			</div>
		</main>
	);
}
