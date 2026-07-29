import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@zev/ui/components/card";
import { motion, useSpring, useTransform } from "framer-motion";
import { Database, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useEffect } from "react";
import { getDashboardStats } from "@/api/system/dashboard";

function AnimatedNumber({ value }: { value: number }) {
	const spring = useSpring(0, { bounce: 0, duration: 1500 });
	const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

	useEffect(() => {
		spring.set(value);
	}, [spring, value]);

	return <motion.span>{display}</motion.span>;
}

export default function Dashboard() {
	const { data: stats, isLoading } = useQuery({
		queryKey: ["dashboardStats"],
		queryFn: getDashboardStats,
	});

	const statCards = [
		{
			title: "总用户数",
			value: stats?.total_users || 0,
			icon: <Users className="h-4 w-4 text-muted-foreground" />,
			description: "系统所有注册用户",
		},
		{
			title: "活跃用户数",
			value: stats?.active_users || 0,
			icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
			description: "状态正常的用户",
		},
		{
			title: "角色数量",
			value: stats?.total_roles || 0,
			icon: <ShieldCheck className="h-4 w-4 text-muted-foreground" />,
			description: "系统定义的角色总数",
		},
		{
			title: "字典类型数",
			value: stats?.system_dict_count || 0,
			icon: <Database className="h-4 w-4 text-muted-foreground" />,
			description: "系统配置的字典总数",
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">数据概览</h2>
				<p className="text-muted-foreground">欢迎回来，这里是系统的实时数据统计。</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statCards.map((card, index) => (
					<motion.div
						key={card.title}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, delay: index * 0.1 }}
					>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">{card.title}</CardTitle>
								{card.icon}
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{isLoading ? (
										<span className="text-transparent bg-muted animate-pulse rounded w-16 inline-block h-8"></span>
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
				<Card className="col-span-4">
					<CardHeader>
						<CardTitle>系统介绍</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground leading-relaxed">
							Zev 是一个现代化的企业级中后台管理系统，基于最新的技术栈构建。提供了极简的黑白灰美学设计，
							致力于提升企业内部的管理效率。
						</p>
						<div className="flex gap-2">
							<span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
								Go 1.25
							</span>
							<span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
								React 19
							</span>
							<span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
								Tailwind V4
							</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
