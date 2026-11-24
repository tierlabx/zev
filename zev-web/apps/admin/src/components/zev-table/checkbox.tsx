import { cn } from "@zev/ui/lib/utils";
import { Check, Minus } from "lucide-react";
import * as React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked"> {
	checked?: boolean | "indeterminate";
	onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
		const isIndeterminate = checked === "indeterminate";
		const isChecked = checked === true || isIndeterminate;

		return (
			<div className={cn("relative flex items-center justify-center w-[18px] h-[18px]", className)}>
				<input
					type="checkbox"
					ref={ref}
					className="peer absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
					checked={checked === true}
					onChange={(e) => onCheckedChange?.(e.target.checked)}
					disabled={disabled}
					{...props}
				/>
				<div
					className={cn(
						"w-full h-full border border-muted-foreground/60 rounded-[4px] flex items-center justify-center transition-[background-color,border-color] duration-200 pointer-events-none",
						isChecked ? "bg-primary border-primary text-primary-foreground" : "bg-background",
						"peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
						"peer-disabled:opacity-50 peer-disabled:bg-muted peer-disabled:border-border",
					)}
				>
					{isIndeterminate ? (
						<Minus className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
					) : checked === true ? (
						<Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
					) : null}
				</div>
			</div>
		);
	},
);
Checkbox.displayName = "Checkbox";
