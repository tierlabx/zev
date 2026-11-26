import { AnimateIcon } from "@animate-ui/react/icons";
import {
	scale as motionScale,
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { useNavigate } from "@tanstack/react-router";
import { GravityStarsBackground } from "@zev/ui/components/animate-ui/backgrounds/gravity-stars";
import { ArrowLeft } from "@zev/ui/components/animate-ui/icons/arrow-left";
import { House } from "@zev/ui/components/animate-ui/icons/house";
import { motion } from "motion/react";
import { useI18n } from "@/i18n";
import { clearSessionAndRedirectToLogin } from "@/router/session";
import { useUserStore } from "@/store";
import { findFirstPagePath } from "@/utils/menu-utils";

export default function NotFound() {
	const { t } = useI18n();
	const navigate = useNavigate();
	const menus = useUserStore((state) => state.menus);
	const reduce = useShouldReduceMotion();
	const revealTransition = useTempoTransition(motionTransition.reveal);

	const handleGoHome = () => {
		const firstPath = findFirstPagePath(menus);
		if (firstPath) {
			navigate({ to: firstPath as never });
			return;
		}
		clearSessionAndRedirectToLogin();
	};

	const handleGoBack = () => {
		if (window.history.length > 1) {
			window.history.back();
			return;
		}
		handleGoHome();
	};

	return (
		<GravityStarsBackground
			starsCount={55}
			starsSize={1.8}
			starsOpacity={0.5}
			glowIntensity={6}
			movementSpeed={0.22}
			mouseInfluence={120}
			gravityStrength={50}
			className="relative shrink-0 w-full min-h-[calc(100vh-10rem)] rounded-xl border border-border bg-card text-slate-400 dark:text-slate-300 overflow-hidden"
		>
			<div className="relative z-10 flex min-h-[calc(100vh-10rem)] w-full items-center justify-center p-6 text-foreground">
				<motion.div
					initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
					animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
					transition={revealTransition}
					className="text-center"
				>
					<div className="relative inline-block mb-8">
						<motion.span
							initial={reduce ? { opacity: 0 } : { scale: motionScale.toast, opacity: 0 }}
							animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
							transition={revealTransition}
							className="text-[120px] font-bold leading-none bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent inline-block tabular-nums"
						>
							404
						</motion.span>
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-2">{t("notFound.title")}</h2>
					<p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">{t("notFound.description")}</p>
					<div className="flex items-center justify-center gap-3">
						<AnimateIcon animateOnHover asChild>
							<button
								type="button"
								onClick={handleGoBack}
								className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
							>
								<ArrowLeft className="h-4 w-4" />
								{t("notFound.goBack")}
							</button>
						</AnimateIcon>
						<AnimateIcon animateOnHover asChild>
							<button
								type="button"
								onClick={handleGoHome}
								className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
							>
								<House className="h-4 w-4" />
								{t("notFound.goHome")}
							</button>
						</AnimateIcon>
					</div>
				</motion.div>
			</div>
		</GravityStarsBackground>
	);
}
