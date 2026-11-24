import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";
import { findFirstPagePath } from "@/utils/menu-utils";

export default function NotFound() {
	const { t } = useI18n();
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
				<h2 className="text-xl font-semibold text-foreground mb-2">{t("notFound.title")}</h2>
				<p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">{t("notFound.description")}</p>
				<div className="flex items-center justify-center gap-3">
					<button
						type="button"
						onClick={() => window.history.back()}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						{t("notFound.goBack")}
					</button>
					<button
						type="button"
						onClick={handleGoHome}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
					>
						<Home className="h-4 w-4" />
						{t("notFound.goHome")}
					</button>
				</div>
			</motion.div>
		</div>
	);
}
