import { spawnSync } from "node:child_process";
import { runContractChecks } from "./checks/contract.mjs";
import { runEntropyChecks } from "./checks/entropy.mjs";
import { runFrontendChecks } from "./checks/frontend.mjs";
import { fromRepo } from "./lib/fs-utils.mjs";
import { runPlanCommand } from "./lib/plan-cmd.mjs";
import { printReport, summarizeViolations } from "./lib/reporter.mjs";

const args = process.argv.slice(2);
const command = args[0];

function main() {
	if (!command || command === "--help" || command === "-h") {
		printHelp();
		process.exit(0);
	}

	const json = args.includes("--json");

	switch (command) {
		case "check":
			process.exit(runCheckCommand({ json }));
		case "verify":
			process.exit(runVerifyCommand());
		case "entropy":
			process.exit(runEntropyCommand({ json }));
		case "plan":
			process.exit(runPlanCommand(args.slice(1)));
		default:
			console.error(`未知命令: ${command}\n`);
			printHelp();
			process.exit(2);
	}
}

function printHelp() {
	console.log(`ZEV Agent Harness CLI

用法:
  node scripts/harness/cli.mjs check [--json] [--quick]   运行前后端机械化架构守卫
  node scripts/harness/cli.mjs verify                     运行全量验证 (check + go vet/test + pnpm lint/typecheck)
  node scripts/harness/cli.mjs entropy [--json]           运行文档死链/漂移/大文件热点巡检
  node scripts/harness/cli.mjs plan <new|list|status|archive>  管理长任务执行账本`);
}

function runGoArchcheck() {
	const zevGoDir = fromRepo("zev-go");
	const res = spawnSync("go", ["run", "./cmd/archcheck", "-format=json"], {
		cwd: zevGoDir,
		encoding: "utf8",
	});

	if (res.error) {
		return [
			{
				ruleId: "GO-ARCHCHECK-EXEC",
				severity: "error",
				file: "zev-go/cmd/archcheck",
				line: 1,
				message: `执行 go run ./cmd/archcheck 失败: ${res.error.message}`,
				remediation: "请确认当前环境已安装 Go 1.25+ 并可在 zev-go 目录运行。",
			},
		];
	}

	try {
		const parsed = JSON.parse(res.stdout || "{}");
		return Array.isArray(parsed.violations) ? parsed.violations : [];
	} catch {
		return [
			{
				ruleId: "GO-ARCHCHECK-PARSE",
				severity: "error",
				file: "zev-go/cmd/archcheck",
				line: 1,
				message: `解析 archcheck 输出失败: ${res.stderr || res.stdout}`,
				remediation: "请在 zev-go 目录手动运行 `go run ./cmd/archcheck` 查看具体错误。",
			},
		];
	}
}

function runCheckCommand({ json }) {
	const started = Date.now();
	const violations = [
		...runGoArchcheck(),
		...runFrontendChecks(),
		...runContractChecks(),
	];
	const summary = printReport("ZEV Architecture Check", violations, {
		json,
		durationMs: Date.now() - started,
	});
	return summary.errors > 0 ? 1 : 0;
}

function runEntropyCommand({ json }) {
	const started = Date.now();
	const violations = runEntropyChecks();
	const summary = printReport("ZEV Entropy Inspection", violations, {
		json,
		durationMs: Date.now() - started,
	});
	return summary.errors > 0 ? 1 : 0;
}

function runStep(name, cmd, cmdArgs, cwd) {
	const started = Date.now();
	console.log(`\n==> [${name}] ${cmd} ${cmdArgs.join(" ")}`);
	const res = spawnSync(cmd, cmdArgs, {
		cwd,
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	const durationMs = Date.now() - started;
	const ok = res.status === 0;
	console.log(`${ok ? "PASS" : "FAIL"} [${name}] (${durationMs}ms)`);
	return ok;
}

function runVerifyCommand() {
	const started = Date.now();
	const checkExit = runCheckCommand({ json: false });
	if (checkExit !== 0) {
		return checkExit;
	}

	const zevGoDir = fromRepo("zev-go");
	const zevWebDir = fromRepo("zev-web");
	const steps = [
		["go vet", "go", ["vet", "./..."], zevGoDir],
		["go test", "go", ["test", "./..."], zevGoDir],
		["pnpm lint", "pnpm", ["lint"], zevWebDir],
		["pnpm typecheck", "pnpm", ["run", "typecheck"], zevWebDir],
	];

	for (const [name, cmd, cmdArgs, cwd] of steps) {
		if (!runStep(name, cmd, cmdArgs, cwd)) {
			return 1;
		}
	}

	const summary = summarizeViolations([]);
	console.log(`\nALL VERIFY STAGES PASSED (0 errors, total ${Date.now() - started}ms, ${summary.total} pending)`);
	return 0;
}

main();
