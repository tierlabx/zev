import { Outlet } from "@tanstack/react-router";
import { PageTransition } from "@/components/animate-ui/components/page-transition";

export function Main() {
	return (
		<main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
			{/* 使用固定视口容器承载 view-transition 快照，避免滚动内容溢出遮挡顶栏/侧边栏 */}
			<PageTransition effect="iris" className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
				<div className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden min-h-0">
					<div className="flex-1 flex flex-col pb-4 min-h-0 min-w-0">
						<Outlet />
					</div>
				</div>
			</PageTransition>
		</main>
	);
}
