import {
	CodeBlock,
	CodeBlockActions,
	CodeBlockContent,
	CodeBlockCopyButton,
	CodeBlockHeader,
	CodeBlockTitle,
} from "@zev/ui/components/code-block";
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function extractPlainText(node: ReactNode): string {
	if (typeof node === "string" || typeof node === "number") {
		return String(node);
	}
	if (Array.isArray(node)) {
		return node.map(extractPlainText).join("");
	}
	if (isValidElement<{ children?: ReactNode }>(node)) {
		return extractPlainText(node.props.children);
	}
	return "";
}

const markdownComponents: Components = {
	pre: ({ children }) => <div className="my-2">{children}</div>,
	code: ({ className, children }) => {
		const raw = extractPlainText(children).replace(/\n$/, "");
		const langMatch = /language-([^\s]+)/.exec(className ?? "");
		const isBlock = Boolean(langMatch) || raw.includes("\n");

		if (!isBlock) {
			return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
		}

		const language = langMatch?.[1] || "text";
		return (
			<CodeBlock>
				<CodeBlockHeader>
					<CodeBlockTitle>{language}</CodeBlockTitle>
					<CodeBlockActions>
						<CodeBlockCopyButton value={raw} />
					</CodeBlockActions>
				</CodeBlockHeader>
				<CodeBlockContent>{raw}</CodeBlockContent>
			</CodeBlock>
		);
	},
	p: ({ children }) => <p className="leading-relaxed not-first:mt-2">{children}</p>,
	ul: ({ children }) => <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>,
	ol: ({ children }) => <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>,
	li: ({ children }) => <li className="leading-relaxed">{children}</li>,
	h1: ({ children }) => <h1 className="mt-3 mb-1.5 text-base font-semibold">{children}</h1>,
	h2: ({ children }) => <h2 className="mt-3 mb-1.5 text-sm font-semibold">{children}</h2>,
	h3: ({ children }) => <h3 className="mt-2.5 mb-1 text-sm font-medium">{children}</h3>,
	blockquote: ({ children }) => (
		<blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>
	),
	table: ({ children }) => (
		<div className="my-2 w-full overflow-x-auto rounded-md border border-border">
			<table className="w-full border-collapse text-xs">{children}</table>
		</div>
	),
	thead: ({ children }) => <thead className="bg-muted/50 border-b border-border">{children}</thead>,
	th: ({ children }) => <th className="px-3 py-2 text-left font-medium text-foreground">{children}</th>,
	td: ({ children }) => <td className="border-t border-border px-3 py-2">{children}</td>,
	a: ({ href, children }) => (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="underline underline-offset-4 hover:text-foreground text-primary"
		>
			{children}
		</a>
	),
};

export function ChatMarkdown({ content }: { content: string }) {
	return (
		<div className="min-w-0 text-sm leading-relaxed wrap-break-word">
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
				{content}
			</ReactMarkdown>
		</div>
	);
}
