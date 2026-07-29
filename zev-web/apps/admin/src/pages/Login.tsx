import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@zev/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { ShinyButton } from "@zev/ui/components/shiny-button";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Lock, User } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useLoginMutation, getUserInfoApi } from "@/api/system/auth";
import logoUrl from "@/assets/logo-animated.svg";
import { useUserStore } from "@/store";
import ThreeKoiBackground from "@/components/ThreeKoiBackground/index";

const loginSchema = z.object({
	username: z.string().min(1, { message: "请输入用户名或邮箱" }),
	password: z.string().min(1, { message: "请输入密码" }).min(5, { message: "密码不能少于6位" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
	const navigate = useNavigate();
	const loginMutation = useLoginMutation();
	const setToken = useUserStore((state) => state.setToken);
	const setUserInfo = useUserStore((state) => state.setUserInfo);

	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotateX = useTransform(y, [-500, 500], [8, -8]);
	const rotateY = useTransform(x, [-500, 500], [-8, 8]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			const centerX = window.innerWidth / 2;
			const centerY = window.innerHeight / 2;
			x.set(e.clientX - centerX);
			y.set(e.clientY - centerY);
		};
		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, [x, y]);

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
					} catch {
						toast.error("获取用户信息失败");
					}
				}
				navigate({ to: "/dashboard" });
			},
			onError: (err) => {
				toast.error(err.message || "登录失败");
			},
		});
	};

	return (
		<div className="flex min-h-screen items-center justify-center md:justify-end md:px-[10vw] relative overflow-hidden">
			<ThreeKoiBackground />
			<motion.div
				initial={{ opacity: 0, y: 40, scale: 0.95, rotateX: 10 }}
				animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
				transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
				className="z-10"
				style={{ perspective: 1200 }}
			>
				<motion.div
					style={{
						rotateX,
						rotateY,
						transformStyle: "preserve-3d",
					}}
				>
					<Card className="w-[420px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/40 bg-white/60 backdrop-blur-xl rounded-2xl relative overflow-hidden">
						{/* Decorative blur elements inside the card */}
						<div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
						<div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

						<CardHeader className="p-0 mb-8 flex flex-col items-center gap-4 relative z-10">
							<div className="flex h-16 w-16 items-center justify-center bg-white/40 rounded-2xl shadow-sm border border-white/60 backdrop-blur-md">
								<img src={logoUrl} alt="Logo" className="h-10 w-10 drop-shadow-md" />
							</div>
							<div className="text-center space-y-1.5">
								<h2 className="text-2xl font-bold tracking-tight text-gray-900">欢迎回来</h2>
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
													<div className="relative group">
														<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
															<User className="h-[18px] w-[18px]" />
														</div>
														<Input
															{...field}
															type="text"
															placeholder="用户名或邮箱"
															className="pl-11 h-12 bg-white/50 border-white/40 hover:bg-white/70 focus:bg-white/90 transition-all shadow-sm rounded-xl text-[14px]"
														/>
													</div>
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
													<div className="relative group">
														<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
															<Lock className="h-[18px] w-[18px]" />
														</div>
														<Input
															{...field}
															type="password"
															placeholder="密码"
															className="pl-11 h-12 bg-white/50 border-white/40 hover:bg-white/70 focus:bg-white/90 transition-all shadow-sm rounded-xl text-[14px]"
														/>
													</div>
												</FormControl>
												<FormMessage className="text-[13px] ml-1 text-red-500 font-medium" />
											</FormItem>
										)}
									/>
									<ShinyButton
										type="submit"
										disabled={loginMutation.isPending}
										className="mt-8 w-full h-12 text-[15px] font-medium bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
									>
										{loginMutation.isPending ? (
											"登录中..."
										) : (
											<>
												登 录 <ArrowRight className="h-4 w-4" />
											</>
										)}
									</ShinyButton>
								</form>
							</Form>
						</CardContent>
					</Card>
				</motion.div>
			</motion.div>
		</div>
	);
}
