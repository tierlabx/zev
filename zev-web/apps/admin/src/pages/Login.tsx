import { Button } from "@zev/ui/components/button";
import { Card, CardContent, CardHeader } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import request from "@/api/request";
import logoUrl from "@/assets/logo.svg";
import { useUserStore } from "@/store";
import loginBg from "../assets/login-bg.svg";

export default function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const setToken = useUserStore((state) => state.setToken);
	const navigate = useNavigate();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const data = (await request.post("/system/login", { username, password })) as { token: string };
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
			<Card className="w-[378px] p-8 shadow-[0_24px_60px_#00000033] border-none bg-white rounded-none z-10">
				<CardHeader className="p-0 mb-6 flex flex-col items-center gap-2">
					<div className="flex h-12 w-12 items-center justify-center   text-white">
						<img src={logoUrl} alt="Logo" className="h-8 w-8" />
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<form onSubmit={handleLogin} className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="username" className="text-[13px] font-medium text-black">
								用户名或邮箱
							</label>
							<Input
								id="username"
								type="text"
								value={username}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
								placeholder=""
								required
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="password" className="text-[13px] font-medium text-black">
								密码
							</label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								placeholder=""
								required
							/>
						</div>
						<Button type="submit" disabled={loading} className="mt-6 w-full h-[40px] text-[13px]">
							{loading ? "登录中..." : "登 录"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
