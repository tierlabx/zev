import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { findFirstPagePath } from "@/lib/menu-utils";
import { useUserStore } from "@/store";

export default function NotFound() {
	const navigate = useNavigate();
	const menus = useUserStore((state) => state.menus);

	const handleGoHome = () => {
		const firstPath = findFirstPagePath(menus);
		if (firstPath) {
			navigate({ to: firstPath as never });
			return;
		}
		window.location.href = "/login";
	};

	return (
		<div className="flex h-full min-h-[60vh] items-center justify-center">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
				className="text-center"
			>
				<div className="relative inline-block mb-8">
					<motion.span
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ delay: 0.1, duration: 0.5 }}
						className="text-[120px] font-bold leading-none bg-gradient-to-br from-[#2563EB] to-[#6366F1] bg-clip-text text-transparent"
					>
						404
					</motion.span>
				</div>
				<h2 className="text-xl font-semibold text-gray-700 mb-2">页面未找到</h2>
				<p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
					您访问的页面不存在或没有访问权限，请检查地址或返回首页。
				</p>
				<div className="flex items-center justify-center gap-3">
					<button
						type="button"
						onClick={() => window.history.back()}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						返回上一页
					</button>
					<button
						type="button"
						onClick={handleGoHome}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors shadow-sm"
					>
						<Home className="h-4 w-4" />
						回到首页
					</button>
				</div>
			</motion.div>
		</div>
	);
}
