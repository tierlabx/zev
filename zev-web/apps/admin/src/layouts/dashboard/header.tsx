import { AccountDropdown } from "../components/account-dropdown";
import { Breadcrumb } from "../components/breadcrumb";

export function Header() {
	return (
		<header className="h-16 px-6 bg-white/60 backdrop-blur-xl border-b border-[#E5E5E5] flex items-center justify-between z-10 relative">
			<div className="flex items-center space-x-4">
				<Breadcrumb />
			</div>
			<div className="flex items-center space-x-3">
				<AccountDropdown />
			</div>
		</header>
	);
}
