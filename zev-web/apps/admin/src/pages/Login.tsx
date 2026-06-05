import { zodResolver } from "@hookform/resolvers/zod";
import { BlurFade } from "@zev/ui/components/blur-fade";
import { Card, CardContent, CardHeader } from "@zev/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@zev/ui/components/form";
import { Input } from "@zev/ui/components/input";
import { ShinyButton } from "@zev/ui/components/shiny-button";
import { ArrowRight, Lock, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import request from "@/api/request";
import logoUrl from "@/assets/logo.svg";
import { useUserStore } from "@/store";
import loginBg from "../assets/login-bg.svg";

const loginSchema = z.object({
	username: z.string().min(1, { message: "请输入用户名或邮箱" }),
	password: z.string().min(1, { message: "请输入密码" }).min(5, { message: "密码不能少于6位" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
	const [loading, setLoading] = useState(false);
	const setToken = useUserStore((state) => state.setToken);
	const navigate = useNavigate();

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			username: "",
			password: "",
		},
	});

	const onSubmit = async (values: LoginFormValues) => {
		setLoading(true);
		try {
			const data = (await request.post("/system/login", values)) as { token: string };
			setToken(data.token);
			navigate("/");
		} catch (err: unknown) {
			const error = err as Error;
			toast.error(error.message || "登录失败");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center md:justify-end md:px-[10vw] relative overflow-hidden">
			<img src={loginBg} className="absolute inset-0 w-full h-full object-cover -z-10" alt="Login Background" />
			<BlurFade delay={0.2} inView>
				<Card className="w-[420px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/40 bg-white/60 backdrop-blur-xl rounded-2xl z-10 relative overflow-hidden">
					{/* Decorative blur elements inside the card */}
					<div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

					<CardHeader className="p-0 mb-8 flex flex-col items-center gap-4 relative z-10">
						<div className="flex h-16 w-16 items-center justify-center bg-white/40 rounded-2xl shadow-sm border border-white/60 backdrop-blur-md">
							<img src={logoUrl} alt="Logo" className="h-10 w-10 drop-shadow-md" />
						</div>
						<div className="text-center space-y-1.5">
							<h2 className="text-2xl font-bold tracking-tight text-gray-900">欢迎回来</h2>
							<p className="text-sm text-gray-600 font-medium">登录以访问您的管理后台</p>
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
									disabled={loading}
									className="mt-8 w-full h-12 text-[15px] font-medium bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
								>
									{loading ? (
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
			</BlurFade>
		</div>
	);
}
