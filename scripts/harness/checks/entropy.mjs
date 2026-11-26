import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, fromRepo, toRelPosix, walkFiles } from "../lib/fs-utils.mjs";
import { makeViolation } from "../lib/reporter.mjs";

const LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;
const DRIFT_PATTERNS = [
	{
		regex: /\bWebGPU\b/i,
		message: "文档仍残留已过时的 WebGPU 表述（实际实现为 Three.js WebGL）",
		remediation: "请更新为 Three.js WebGL 描述。",
	},
	{
		regex: /window\.location\.href\s*=\s*["']\/login["']/,
		message: "文档仍提及已废弃的 window.location.href 登录跳转方案",
		remediation: "请更新为 `@/router/session` 无刷新会话切换方案。",
	},
];

/** 按需运行防熵增与漂移巡检 */
export function runEntropyChecks() {
	const violations = [];
	checkDocLinks(violations);
	checkDocDrift(violations);
	checkSwaggerDrift(violations);
	checkOrphanFrontendFiles(violations);
	checkHotspots(violations);
	return violations;
}

function collectCoreDocs() {
	const fixed = ["AGENTS.md", "CLAUDE.md", "README.md", ".agents/skills/zev-project/SKILL.md"]
		.map((rel) => fromRepo(...rel.split("/")))
		.filter((abs) => fs.existsSync(abs));

	const docsMd = walkFiles(fromRepo("docs"), { exts: [".md"] });
	const rulesMd = walkFiles(fromRepo(".agents", "rules"), { exts: [".md"] });
	return [...new Set([...fixed, ...docsMd, ...rulesMd])];
}

function stripCodeBlocks(md) {
	return md
		.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ""))
		.replace(/`[^`\n]+`/g, (inline) => " ".repeat(inline.length));
}

function checkDocLinks(violations) {
	for (const absDoc of collectCoreDocs()) {
		const raw = fs.readFileSync(absDoc, "utf8");
		const cleaned = stripCodeBlocks(raw);
		const lines = cleaned.split(/\r?\n/);
		const docDir = path.dirname(absDoc);
		const relDoc = toRelPosix(absDoc);

		for (let i = 0; i < lines.length; i++) {
			for (const match of lines[i].matchAll(LINK_RE)) {
				const targetRaw = match[1].trim();
				if (
					!targetRaw ||
					targetRaw.startsWith("http://") ||
					targetRaw.startsWith("https://") ||
					targetRaw.startsWith("mailto:") ||
					targetRaw.startsWith("file://") ||
					targetRaw.startsWith("#")
				) {
					continue;
				}
				const targetPathPart = targetRaw.split("#")[0];
				if (!targetPathPart) continue;
				const resolved = targetPathPart.startsWith("/")
					? path.join(REPO_ROOT, targetPathPart)
					: path.resolve(docDir, targetPathPart);
				if (!fs.existsSync(resolved)) {
					violations.push(
						makeViolation({
							ruleId: "ENTROPY-DOC-LINKS",
							severity: "error",
							file: relDoc,
							line: i + 1,
							message: `文档存在失效路径链接: ${targetRaw}`,
							remediation: "请修正为实际存在的相对路径，或移除已删除文件的引用。",
						}),
					);
				}
			}
		}
	}
}

function checkDocDrift(violations) {
	for (const absDoc of collectCoreDocs()) {
		const relDoc = toRelPosix(absDoc);
		// exec-plans 历史记录与架构规则定义文档自身可能引用反例，跳过避免误报
		if (relDoc.startsWith("docs/exec-plans/")) continue;

		const cleaned = stripCodeBlocks(fs.readFileSync(absDoc, "utf8"));
		const lines = cleaned.split(/\r?\n/);
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes("严禁") || lines[i].includes("禁止")) continue;
			for (const p of DRIFT_PATTERNS) {
				if (p.regex.test(lines[i])) {
					violations.push(
						makeViolation({
							ruleId: "ENTROPY-DOC-DRIFT",
							severity: "warn",
							file: relDoc,
							line: i + 1,
							message: p.message,
							remediation: p.remediation,
						}),
					);
				}
			}
		}
	}
}

function checkSwaggerDrift(violations) {
	const swaggerFile = fromRepo("zev-go", "docs", "swagger.json");
	if (!fs.existsSync(swaggerFile)) return;

	const swaggerMtime = fs.statSync(swaggerFile).mtimeMs;
	const modulesDir = fromRepo("zev-go", "modules");
	const goFiles = walkFiles(modulesDir, { exts: [".go"], ignoreSuffixes: ["_test.go"] }).filter(
		(abs) => {
			const rel = toRelPosix(abs);
			return rel.includes("/controller/") || rel.includes("/dto/");
		},
	);

	let newestFile = null;
	let newestMtime = 0;
	for (const f of goFiles) {
		const mtime = fs.statSync(f).mtimeMs;
		if (mtime > newestMtime) {
			newestMtime = mtime;
			newestFile = f;
		}
	}

	if (newestFile && newestMtime - swaggerMtime > 60_000) {
		violations.push(
			makeViolation({
				ruleId: "ENTROPY-SWAGGER-DRIFT",
				severity: "info",
				file: toRelPosix(newestFile),
				line: 1,
				message: "存在较 zev-go/docs/swagger.json 更新的 controller/dto 文件，请确认 Swagger 文档是否需要重新生成",
				remediation: "在 zev-go 目录运行 swag init 或通过本地 air 热重载自动同步。",
			}),
		);
	}
}

function resolveFrontendImport(fromFileAbs, specifier, adminSrc) {
	let base = null;
	if (specifier.startsWith("@/")) {
		base = path.join(adminSrc, specifier.slice(2));
	} else if (specifier.startsWith("./") || specifier.startsWith("../")) {
		base = path.resolve(path.dirname(fromFileAbs), specifier);
	}
	if (!base) return null;

	for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
			return path.normalize(candidate);
		}
	}
	return null;
}

function checkOrphanFrontendFiles(violations) {
	const adminSrc = fromRepo("zev-web", "apps", "admin", "src");
	const allSrcFiles = walkFiles(adminSrc, { exts: [".ts", ".tsx"] });
	const importedTargets = new Set();
	const importSpecRe = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;

	for (const abs of allSrcFiles) {
		const text = fs.readFileSync(abs, "utf8");
		for (const m of text.matchAll(importSpecRe)) {
			const resolved = resolveFrontendImport(abs, m[1], adminSrc);
			if (resolved) importedTargets.add(resolved);
		}
	}

	const candidates = walkFiles(path.join(adminSrc, "api"), { exts: [".ts"] });
	for (const abs of candidates) {
		const rel = toRelPosix(abs);
		const insideSrc = rel.replace(/^zev-web\/apps\/admin\/src\//, "");
		if (insideSrc === "api/queryClient.ts" || insideSrc === "api/request.ts") continue;

		if (!importedTargets.has(path.normalize(abs))) {
			violations.push(
				makeViolation({
					ruleId: "ENTROPY-ORPHAN-FILES",
					severity: "warn",
					file: rel,
					line: 1,
					message: `未在前端 src 中检测到任何模块导入 ${rel}`,
					remediation: "若该 API/类型定义已废弃，请直接清理删除。",
				}),
			);
		}
	}
}

function checkHotspots(violations) {
	const goFiles = walkFiles(fromRepo("zev-go"), {
		exts: [".go"],
		ignoreSuffixes: ["_test.go", "_generated.go"],
	}).filter((f) => toRelPosix(f) !== "zev-go/docs/docs.go");

	const feFiles = walkFiles(fromRepo("zev-web", "apps", "admin", "src"), {
		exts: [".ts", ".tsx"],
		ignoreSuffixes: [".stories.tsx", ".d.ts"],
	}).filter((f) => !toRelPosix(f).includes("/locales/"));

	const large = [];
	for (const f of [...goFiles, ...feFiles]) {
		const lineCount = fs.readFileSync(f, "utf8").split(/\r?\n/).length;
		if (lineCount > 500) {
			large.push({ file: toRelPosix(f), lineCount });
		}
	}
	large.sort((a, b) => b.lineCount - a.lineCount);

	for (const item of large) {
		violations.push(
			makeViolation({
				ruleId: "ENTROPY-HOTSPOTS",
				severity: "info",
				file: item.file,
				line: 1,
				message: `大文件观察热点 (${item.lineCount} 行 > 500 行建议上限)`,
				remediation: "后续迭代修改该文件时，建议按功能拆分为内聚子模块。",
			}),
		);
	}
}
