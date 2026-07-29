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
						"w-full h-full border border-gray-300 rounded-[4px] flex items-center justify-center transition-all duration-200 pointer-events-none",
						isChecked ? "bg-black border-black" : "bg-white",
						"peer-focus-visible:ring-2 peer-focus-visible:ring-black/20 peer-focus-visible:ring-offset-1",
						"peer-disabled:opacity-50 peer-disabled:bg-gray-100 peer-disabled:border-gray-200",
					)}
				>
					{isIndeterminate ? (
						<Minus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
					) : checked === true ? (
						<Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
					) : null}
				</div>
			</div>
		);
	},
);
Checkbox.displayName = "Checkbox";
