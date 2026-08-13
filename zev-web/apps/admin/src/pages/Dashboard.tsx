import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zev/ui/components/card";
import { Progress } from "@zev/ui/components/progress";
import { motion, useSpring, useTransform } from "framer-motion";
import { Activity, Cpu, Database, HardDrive, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type DashboardActivityRes, getDashboardStats } from "@/api/system/dashboard";

function AnimatedNumber({ value }: { value: number }) {
	const spring = useSpring(0, { bounce: 0, duration: 1500 });
	const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

	useEffect(() => {
		spring.set(value);
	}, [spring, value]);

	return <motion.span>{display}</motion.span>;
}

export default function Dashboard() {
	const { data: res, isLoading } = useQuery({
		queryKey: ["dashboardStats"],
		queryFn: getDashboardStats,
	});

	const stats = res?.stats;
	const trends = res?.trends || [];
	const activities = res?.activities || [];
	const health = res?.health;

	const statCards = [
		{
			title: "总用户数",
			value: stats?.userTotal || 0,
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			description: "系统所有注册用户",
		},
		{
			title: "角色数量",
			value: stats?.roleTotal || 0,
			icon: <ShieldCheck className="h-4 w-4 text-muted-foreground" />,
			description: "系统定义的角色总数",
		},
		{
			title: "菜单权限数",
			value: stats?.menuTotal || 0,
			icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
			description: "系统定义的菜单路由",
		},
		{
			title: "字典类型数",
			value: stats?.dictTotal || 0,
			icon: <Database className="h-4 w-4 text-muted-foreground" />,
			description: "系统配置的字典总数",
		},
	];

	return (
		<div className="space-y-6 overflow-hidden pb-4">
			{/* 区块 1：统计卡片 */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statCards.map((card, index) => (
					<motion.div
						key={card.title}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, delay: 0.15 + index * 0.05 }}
					>
						<Card className="hover:-translate-y-1 hover:shadow-md transition-all duration-300">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">{card.title}</CardTitle>
								{card.icon}
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{isLoading ? (
										<span className="bg-muted animate-pulse rounded w-16 inline-block h-8"></span>
									) : (
										<AnimatedNumber value={card.value} />
									)}
								</div>
								<p className="text-xs text-muted-foreground mt-1">{card.description}</p>
							</CardContent>
						</Card>
					</motion.div>
				))}
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				{/* 区块 2：趋势图 */}
				<motion.div
					className="col-span-4 flex flex-col"
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
				>
					<Card className="flex-1">
						<CardHeader>
							<CardTitle>用户新增趋势</CardTitle>
							<CardDescription>最近 7 天的每日新增用户数量</CardDescription>
						</CardHeader>
						<CardContent className="min-h-[300px]">
							{isLoading ? (
								<div className="w-full h-full bg-muted animate-pulse rounded-md min-h-[300px]" />
							) : (
								<ResponsiveContainer width="100%" height={300}>
									<AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
										<defs>
											<linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="var(--color-primary, #2563EB)" stopOpacity={0.3} />
												<stop offset="95%" stopColor="var(--color-primary, #2563EB)" stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
										<XAxis
											dataKey="date"
											axisLine={false}
											tickLine={false}
											tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
											dy={10}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
										/>
										<Tooltip
											contentStyle={{
												borderRadius: "8px",
												border: "1px solid var(--color-border)",
												backgroundColor: "var(--color-background)",
											}}
											itemStyle={{ color: "var(--color-foreground)" }}
										/>
										<Area
											type="monotone"
											dataKey="count"
											stroke="var(--color-primary, #2563EB)"
											fillOpacity={1}
											fill="url(#colorCount)"
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							)}
						</CardContent>
					</Card>
				</motion.div>

				<div className="col-span-3 space-y-4 flex flex-col">
					{/* 区块 3：系统健康 */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.4, delay: 0.6 }}
					>
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-md flex items-center gap-2">
									<Activity className="h-4 w-4" />
									系统健康状态
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-1">
									<div className="flex justify-between text-xs">
										<span className="flex items-center gap-1 text-muted-foreground">
											<Cpu className="h-3 w-3" /> CPU 使用率
										</span>
										<span className="font-medium">{health?.cpuUsage ?? 0}%</span>
									</div>
									<Progress value={health?.cpuUsage || 0} className="h-2" />
								</div>
								<div className="space-y-1">
									<div className="flex justify-between text-xs">
										<span className="flex items-center gap-1 text-muted-foreground">
											<HardDrive className="h-3 w-3" /> 内存使用率
										</span>
										<span className="font-medium">{health?.memoryUsage ?? 0}%</span>
									</div>
									<Progress value={health?.memoryUsage || 0} className="h-2" />
								</div>
								<div className="space-y-1">
									<div className="flex justify-between text-xs">
										<span className="flex items-center gap-1 text-muted-foreground">
											<Database className="h-3 w-3" /> DB 连通率
										</span>
										<span className="font-medium">{health?.dbResponse ?? 0}%</span>
									</div>
									<Progress value={health?.dbResponse || 0} className="h-2" />
								</div>
							</CardContent>
						</Card>
					</motion.div>

					{/* 区块 4：最新动态 */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.4, delay: 0.65 }}
						className="flex-1 flex flex-col"
					>
						<Card className="flex-1">
							<CardHeader className="pb-3">
								<CardTitle className="text-md">最新操作动态</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="space-y-3">
										{[1, 2, 3].map((i) => (
											<div key={i} className="h-8 bg-muted animate-pulse rounded" />
										))}
									</div>
								) : activities.length > 0 ? (
									<div className="space-y-4">
										{activities.map((act: DashboardActivityRes, idx: number) => (
											<motion.div
												key={act.id}
												initial={{ opacity: 0, x: 20 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ duration: 0.3, delay: 0.4 + idx * 0.05 }}
												className="flex items-start gap-3"
											>
												<div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
												<div className="flex flex-col gap-1 w-full">
													<div className="flex justify-between text-sm">
														<span className="font-medium">{act.operator}</span>
														<span className="text-xs text-muted-foreground">{act.createdAt}</span>
													</div>
													<span className="text-xs text-muted-foreground">{act.action}</span>
												</div>
											</motion.div>
										))}
									</div>
								) : (
									<div className="text-sm text-muted-foreground text-center py-4">暂无活动</div>
								)}
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
