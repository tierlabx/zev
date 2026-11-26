import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** ZEV Monorepo 仓库根目录绝对路径 */
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const ALLOW_RE = /\/\/\s*harness:allow\s+([A-Z0-9-]+)(?:\s+(.*))?$/;

/** 将绝对路径转换为相对仓库根的 POSIX 风格路径 */
export function toRelPosix(absPath) {
	return path.relative(REPO_ROOT, absPath).split(path.sep).join("/");
}

/** 从仓库相对路径解析绝对路径 */
export function fromRepo(...segments) {
	return path.resolve(REPO_ROOT, ...segments);
}

/** 递归遍历目录，返回匹配的绝对文件路径列表（已排序） */
export function walkFiles(absDir, options = {}) {
	const {
		exts = [],
		ignoreDirs = ["node_modules", ".git", "dist", "storybook-static", "tmp"],
		ignoreSuffixes = [],
	} = options;
	const results = [];
	if (!fs.existsSync(absDir)) return results;

	const stack = [absDir];
	while (stack.length > 0) {
		const current = stack.pop();
		const entries = fs.readdirSync(current, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				if (!ignoreDirs.includes(entry.name)) {
					stack.push(path.join(current, entry.name));
				}
				continue;
			}
			if (exts.length > 0 && !exts.some((ext) => entry.name.endsWith(ext))) {
				continue;
			}
			if (ignoreSuffixes.some((sfx) => entry.name.endsWith(sfx))) {
				continue;
			}
			results.push(path.join(current, entry.name));
		}
	}

	results.sort();
	return results;
}

/** 检查指定行（0-based）或其前一行是否存在带非空原因的 harness:allow 注释 */
export function hasHarnessAllow(lines, lineIdx, ruleId) {
	for (const idx of [lineIdx, lineIdx - 1]) {
		if (idx < 0 || idx >= lines.length) continue;
		const match = lines[idx].match(ALLOW_RE);
		if (match && match[1] === ruleId && (match[2] ?? "").trim().length >= 2) {
			return true;
		}
	}
	return false;
}

/** 判断某行是否为单行/块级纯注释行 */
export function isCommentLine(line) {
	const trimmed = line.trim();
	return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
}

/** 计算给定字符偏移量在文本中的 1-based 行号 */
export function lineAtOffset(content, offset) {
	let line = 1;
	for (let i = 0; i < offset && i < content.length; i++) {
		if (content.charCodeAt(i) === 10) line++;
	}
	return line;
}
