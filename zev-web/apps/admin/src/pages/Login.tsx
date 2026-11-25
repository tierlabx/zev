import { AnimateIcon } from "@animate-ui/react/icons";
import {
	blur as motionBlur,
	scale as motionScale,
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "@zev/ui/components/animate-ui/icons/arrow-right";
import { Lock } from "@zev/ui/components/animate-ui/icons/lock";
import { User } from "@zev/ui/components/animate-ui/icons/user";
import { Card, CardContent, CardHeader } from "@zev/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { ShinyButton } from "@zev/ui/components/shiny-button";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { getUserInfoApi, useLoginMutation } from "@/api/system/auth";
import logoUrl from "@/assets/logo-animated.svg";
import ShaderKoiBackground from "@/components/ShaderKoiBackground";
import { useI18n } from "@/i18n";
import { syncRouterRoutes } from "@/router/session";
import { useUserStore } from "@/store";
import { findFirstPagePath } from "@/utils/menu-utils";

type LoginFormValues = {
	username: string;
	password: string;
};

export default function Login() {
	const { t } = useI18n();
	const navigate = useNavigate();
	const loginMutation = useLoginMutation();
	const setToken = useUserStore((state) => state.setToken);
	const setUserInfo = useUserStore((state) => state.setUserInfo);

	const loginSchema = useMemo(
		() =>
			z.object({
				username: z.string().min(1, { message: t("login.usernameRequired") }),
				password: z
					.string()
					.min(1, { message: t("login.passwordRequired") })
					.min(5, { message: t("login.passwordMin") }),
			}),
		[t],
	);

	const reduce = useShouldReduceMotion();
	const revealTransition = useTempoTransition(motionTransition.reveal);
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotateX = useTransform(y, [-500, 500], [8, -8]);
	const rotateY = useTransform(x, [-500, 500], [-8, 8]);

	useEffect(() => {
		if (reduce) {
			x.set(0);
			y.set(0);
			return;
		}
		const handleMouseMove = (e: MouseEvent) => {
			const centerX = window.innerWidth / 2;
			const centerY = window.innerHeight / 2;
			x.set(e.clientX - centerX);
			y.set(e.clientY - centerY);
		};
		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, [reduce, x, y]);

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			username: "",
			password: "",
		},
	});

	const onSubmit = (values: LoginFormValues) => {
		loginMutation.mutate(values, {
			onSuccess: async (data) => {
				if (data?.token) {
					setToken(data.token);
					try {
						const userInfo = await getUserInfoApi();
						setUserInfo(userInfo);
						syncRouterRoutes(userInfo.menus);
						const firstPage = findFirstPagePath(userInfo.menus);
						await navigate({ to: (firstPage || "/dashboard") as never, replace: true });
						return;
					} catch {
						useUserStore.getState().logout();
						toast.error(t("login.fetchUserInfoFailed"));
					}
				}
			},
			onError: (err) => {
				toast.error(err.message || t("login.loginFailed"));
			},
		});
	};

	return (
		<div className="flex min-h-screen items-center justify-center md:justify-end md:px-[10vw] relative overflow-hidden bg-slate-900">
			<ShaderKoiBackground />
			<motion.div
				initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: motionScale.toast, filter: motionBlur.surface }}
				animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
				transition={revealTransition}
				className="z-10 w-full max-w-[420px] px-4 md:px-0"
				style={{ perspective: 1200 }}
			>
				<motion.div
					style={
						reduce
							? undefined
							: {
									rotateX,
									rotateY,
									transformStyle: "preserve-3d",
								}
					}
				>
					<Card
						data-login-card
						className="w-full p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/40 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/75 backdrop-blur-xl rounded-2xl relative overflow-hidden"
					>
						{/* Decorative blur elements inside the card */}
						<div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
						<div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

						<CardHeader className="p-0 mb-8 flex flex-col items-center gap-4 relative z-10">
							<div className="flex h-16 w-16 items-center justify-center bg-white/40 dark:bg-slate-800/60 rounded-2xl shadow-sm border border-white/60 dark:border-slate-700/60 backdrop-blur-md">
								<img src={logoUrl} alt="Logo" className="h-10 w-10 drop-shadow-md" />
							</div>
							<div className="text-center space-y-1.5">
								<h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
									{t("login.welcome")}
								</h2>
							</div>
						</CardHeader>
						<CardContent className="p-0 relative z-10">
							<Form {...form}>
								<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
									<FormField
										control={form.control}
										name="username"
										render={({ field }) => (
											<FormItem className="space-y-1">
												<FormControl>
													<AnimateIcon animateOnHover asChild>
														<div className="relative group">
															<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
																<User className="h-[18px] w-[18px]" />
															</div>
															<Input
																{...field}
																type="text"
																placeholder={t("login.usernamePlaceholder")}
																className="pl-11 h-12 bg-white/50 dark:bg-slate-800/60 border-white/40 dark:border-slate-700/60 hover:bg-white/70 dark:hover:bg-slate-800/80 focus:bg-white/90 dark:focus:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 transition-[background-color,border-color,box-shadow] shadow-sm rounded-xl text-[14px]"
															/>
														</div>
													</AnimateIcon>
												</FormControl>
												<FormMessage className="text-[13px] ml-1 text-red-500 font-medium" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem className="space-y-1">
												<FormControl>
													<AnimateIcon animateOnHover asChild>
														<div className="relative group">
															<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
																<Lock className="h-[18px] w-[18px]" />
															</div>
															<Input
																{...field}
																type="password"
																placeholder={t("login.passwordPlaceholder")}
																className="pl-11 h-12 bg-white/50 dark:bg-slate-800/60 border-white/40 dark:border-slate-700/60 hover:bg-white/70 dark:hover:bg-slate-800/80 focus:bg-white/90 dark:focus:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 transition-[background-color,border-color,box-shadow] shadow-sm rounded-xl text-[14px]"
															/>
														</div>
													</AnimateIcon>
												</FormControl>
												<FormMessage className="text-[13px] ml-1 text-red-500 font-medium" />
											</FormItem>
										)}
									/>
									<AnimateIcon animateOnHover asChild>
										<ShinyButton
											type="submit"
											disabled={loginMutation.isPending}
											className="mt-8 w-full h-12 text-[15px] font-medium bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-[background-color,box-shadow] flex items-center justify-center gap-2 cursor-pointer"
										>
											{loginMutation.isPending ? (
												t("login.submitting")
											) : (
												<>
													{t("login.submit")} <ArrowRight className="h-4 w-4" />
												</>
											)}
										</ShinyButton>
									</AnimateIcon>
								</form>
							</Form>
						</CardContent>
					</Card>
				</motion.div>
			</motion.div>
		</div>
	);
}
