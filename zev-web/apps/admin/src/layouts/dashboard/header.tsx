import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/store";

export function Header() {
	const logout = useUserStore((state) => state.logout);
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	return (
		<header className="h-16 px-8 bg-white border-b border-[#E5E5E5] flex items-center justify-between">
			<div className="text-sm text-[#666666]">Dashboard / Home</div>
			<div className="flex items-center space-x-3">
				<span className="font-medium text-black text-sm">Admin</span>
				<div className="h-8 w-8 bg-[#F5F5F5] flex items-center justify-center text-xs">M</div>
				<button
					type="button"
					onClick={handleLogout}
					className="text-xs text-[#666666] hover:text-black focus:outline-none"
				>
					[退出]
				</button>
			</div>
		</header>
	);
}
