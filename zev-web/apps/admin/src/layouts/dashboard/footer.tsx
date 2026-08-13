export function Footer() {
	return (
		<footer className="h-12 flex items-center justify-center text-xs text-muted-foreground bg-white border-t border-border shrink-0 z-10 w-full relative transition-all">
			{new Date().getFullYear()} © Zev Admin. All Rights Reserved.
		</footer>
	);
}
