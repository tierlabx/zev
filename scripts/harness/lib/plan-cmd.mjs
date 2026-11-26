import fs from "node:fs";
import path from "node:path";
import { fromRepo, toRelPosix, walkFiles } from "./fs-utils.mjs";

const ACTIVE_DIR = fromRepo("docs", "exec-plans", "active");
const COMPLETED_DIR = fromRepo("docs", "exec-plans", "completed");
const TEMPLATE_PATH = fromRepo("docs", "exec-plans", "TEMPLATE.md");

/** 处理长任务执行账本命令: plan <new|list|status|archive> */
export function runPlanCommand(args) {
	const [sub = "status", ...rest] = args;

	switch (sub) {
		case "new":
			return createPlan(rest);
		case "list":
			return listPlans();
		case "status":
			return showActiveStatus();
		case "archive":
			return archivePlan(rest[0]);
		default:
			console.error(`未知 plan 子命令: ${sub}`);
			console.log("用法: node scripts/harness/cli.mjs plan <new|list|status|archive>");
			return 1;
	}
}

function createPlan(args) {
	const slug = args.find((a) => !a.startsWith("--"));
	if (!slug) {
		console.error("请提供计划 slug，例如: plan new agent-provider");
		return 1;
	}
	const titleFlagIdx = args.indexOf("--title");
	const title = titleFlagIdx >= 0 && args[titleFlagIdx + 1] ? args[titleFlagIdx + 1] : slug;

	const date = new Date().toISOString().slice(0, 10);
	const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
	const destPath = path.join(ACTIVE_DIR, `${date}-${safeSlug}.md`);
	if (fs.existsSync(destPath)) {
		console.error(`计划文件已存在: ${toRelPosix(destPath)}`);
		return 1;
	}

	fs.mkdirSync(ACTIVE_DIR, { recursive: true });
	let content = fs.existsSync(TEMPLATE_PATH)
		? fs.readFileSync(TEMPLATE_PATH, "utf8")
		: "# {{TITLE}}\n\n- 状态: active\n- 创建日期: {{DATE}}\n";
	content = content.replaceAll("{{TITLE}}", title).replaceAll("{{DATE}}", date);

	fs.writeFileSync(destPath, content, "utf8");
	console.log(`已创建长任务执行账本: ${toRelPosix(destPath)}`);
	return 0;
}

function summarizeFile(absPath) {
	const text = fs.readFileSync(absPath, "utf8");
	const lines = text.split(/\r?\n/);
	const title = (lines.find((l) => l.startsWith("# ")) ?? path.basename(absPath)).replace(/^#\s*/, "");
	const totalTasks = lines.filter((l) => /^\s*-\s*\[[ xX]\]/.test(l)).length;
	const doneTasks = lines.filter((l) => /^\s*-\s*\[[xX]\]/.test(l)).length;
	return { file: toRelPosix(absPath), name: path.basename(absPath), title, doneTasks, totalTasks, text };
}

function listPlans() {
	const active = walkFiles(ACTIVE_DIR, { exts: [".md"] }).map(summarizeFile);
	const completed = walkFiles(COMPLETED_DIR, { exts: [".md"] }).map(summarizeFile);

	console.log(`进行中计划 (active: ${active.length}):`);
	if (active.length === 0) console.log("  (无)");
	for (const p of active) {
		console.log(`  - ${p.name} | ${p.title} [${p.doneTasks}/${p.totalTasks}]`);
	}

	console.log(`\n已归档计划 (completed: ${completed.length}):`);
	if (completed.length === 0) console.log("  (无)");
	for (const p of completed) {
		console.log(`  - ${p.name} | ${p.title} [${p.doneTasks}/${p.totalTasks}]`);
	}
	return 0;
}

function showActiveStatus() {
	const active = walkFiles(ACTIVE_DIR, { exts: [".md"] }).map(summarizeFile);
	if (active.length === 0) {
		console.log("当前无进行中的长任务执行账本 (docs/exec-plans/active/)。");
		return 0;
	}

	for (const p of active) {
		console.log(`=== ${p.title} (${p.file}) [${p.doneTasks}/${p.totalTasks}] ===`);
		const handoffIdx = p.text.indexOf("## Session Handoff");
		if (handoffIdx >= 0) {
			console.log(p.text.slice(handoffIdx).trim());
		}
		console.log("");
	}
	return 0;
}

function archivePlan(target) {
	if (!target) {
		console.error("请指定要归档的计划文件名或 slug");
		return 1;
	}
	const files = walkFiles(ACTIVE_DIR, { exts: [".md"] });
	const found = files.find((f) => path.basename(f) === target || path.basename(f).includes(target));
	if (!found) {
		console.error(`未在 active 目录找到匹配计划: ${target}`);
		return 1;
	}
	fs.mkdirSync(COMPLETED_DIR, { recursive: true });
	const dest = path.join(COMPLETED_DIR, path.basename(found));
	fs.renameSync(found, dest);
	console.log(`已归档至: ${toRelPosix(dest)}`);
	return 0;
}
