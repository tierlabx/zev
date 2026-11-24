import {
	TabsContent as TabsContentPrimitive,
	type TabsContentProps,
	TabsContents as TabsContentsPrimitive,
	type TabsContentsProps,
	TabsHighlight,
	TabsHighlightItem,
	TabsList as TabsListPrimitive,
	type TabsListProps,
	Tabs as TabsPrimitive,
	type TabsProps,
	TabsTrigger as TabsTriggerPrimitive,
	type TabsTriggerProps,
} from "@animate-ui/react/primitives/tabs";
import { cn } from "@zev/ui/lib/utils";

function Tabs({ className, ...props }: TabsProps) {
	return <TabsPrimitive className={cn("flex flex-col gap-2", className)} {...props} />;
}

function TabsList({ className, children, ...props }: TabsListProps) {
	return (
		<TabsHighlight className="inset-0 rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-input/30">
			<TabsListPrimitive
				className={cn(
					"inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
					className,
				)}
				{...props}
			>
				{children}
			</TabsListPrimitive>
		</TabsHighlight>
	);
}

function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
	return (
		<TabsHighlightItem value={value} className="flex-1">
			<TabsTriggerPrimitive
				value={value}
				className={cn(
					"relative z-[1] inline-flex h-[calc(100%-1px)] w-full flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
					className,
				)}
				{...props}
			/>
		</TabsHighlightItem>
	);
}

function TabsContents({ className, ...props }: TabsContentsProps) {
	return <TabsContentsPrimitive className={cn("overflow-hidden", className)} {...props} />;
}

function TabsContent({ className, ...props }: TabsContentProps) {
	return <TabsContentPrimitive className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsContents, TabsList, TabsTrigger };
