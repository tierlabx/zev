import fs from "node:fs";
import {
	fromRepo,
	hasHarnessAllow,
	isCommentLine,
	toRelPosix,
	walkFiles,
} from "../lib/fs-utils.mjs";
import { makeViolation } from "../lib/reporter.mjs";

const FORCE_MOUNT_RE = /\bforceMount\b/;
const AT_LIB_UTILS_RE = /from\s+["']@\/lib\/utils["']/;
const IMPORT_STAR_REACT_RE = /^\s*import\s+\*\s+as\s+React\s+from\s+["']react["'];?\s*$/m;
const NATIVE_DIALOG_RE = /\bwindow\.(alert|confirm|prompt)\s*\(/;
const HARD_LOCATION_RE = /\bwindow\.location\.(href\s*=|reload\s*\(|replace\s*\()/;

/** 检查前端架构与 UI 红线 */
export function runFrontendChecks() {
	const violations = [];
	const adminSrc = fromRepo("zev-web", "apps", "admin", "src");
	const uiSrc = fromRepo("zev-web", "packages", "ui", "src");

	const adminFiles = walkFiles(adminSrc, {
		exts: [".ts", ".tsx"],
		ignoreSuffixes: [".stories.tsx", ".d.ts"],
	});
	const uiFiles = walkFiles(uiSrc, {
		exts: [".ts", ".tsx"],
		ignoreSuffixes: [".stories.tsx", ".d.ts"],
	});

	checkForceMount([...adminFiles, ...uiFiles], violations);
	checkAnimateUiRegistry(violations);
	checkUnsafeBrowserApi(adminFiles, violations);
	checkStackGuard(violations);

	return violations;
}

function checkForceMount(files, violations) {
	for (const abs of files) {
		const rel = toRelPosix(abs);
		const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
		for (let i = 0; i < lines.length; i++) {
			if (isCommentLine(lines[i])) continue;
			if (FORCE_MOUNT_RE.test(lines[i]) && !hasHarnessAllow(lines, i, "FE-NO-FORCEMOUNT")) {
				violations.push(
					makeViolation({
						ruleId: "FE-NO-FORCEMOUNT",
						file: rel,
						line: i + 1,
						message: "弹出层组件禁止传入 forceMount（会导致关闭态透明容器拦截下方页面点击）",
						remediation: "移除 forceMount 属性，依赖组件自身的动画挂载与关闭逻辑。",
					}),
				);
			}
		}
	}

	const dropdownPath = fromRepo("zev-web", "packages", "ui", "src", "components", "dropdown-menu.tsx");
	if (fs.existsSync(dropdownPath)) {
		const content = fs.readFileSync(dropdownPath, "utf8");
		if (!content.includes("data-[state=closed]:pointer-events-none")) {
			violations.push(
				makeViolation({
					ruleId: "FE-NO-FORCEMOUNT",
					file: toRelPosix(dropdownPath),
					line: 1,
					message: "DropdownMenuContent 缺失 data-[state=closed]:pointer-events-none 防穿透类",
					remediation: "在 DropdownMenuContent 的默认 className 中保留 data-[state=closed]:pointer-events-none。",
				}),
			);
		}
	}
}

function checkAnimateUiRegistry(violations) {
	const animateDir = fromRepo("zev-web", "packages", "ui", "src", "components", "animate-ui");
	const files = walkFiles(animateDir, {
		exts: [".ts", ".tsx"],
		ignoreSuffixes: [".stories.tsx", ".d.ts"],
	});

	for (const abs of files) {
		const rel = toRelPosix(abs);
		const content = fs.readFileSync(abs, "utf8");
		const lines = content.split(/\r?\n/);

		for (let i = 0; i < lines.length; i++) {
			if (AT_LIB_UTILS_RE.test(lines[i]) && !hasHarnessAllow(lines, i, "FE-ANIMATE-UI-REGISTRY")) {
				violations.push(
					makeViolation({
						ruleId: "FE-ANIMATE-UI-REGISTRY",
						file: rel,
						line: i + 1,
						message: "animate-ui 组件中禁止使用 registry 默认的 @/lib/utils 导入路径",
						remediation: '请将 cn 导入修正为 "@zev/ui/lib/utils"。',
					}),
				);
			}
		}

		const starMatch = content.match(IMPORT_STAR_REACT_RE);
		if (starMatch) {
			const withoutImport = content.replace(IMPORT_STAR_REACT_RE, "");
			if (!/\bReact\./.test(withoutImport)) {
				const lineNum = lines.findIndex((l) => IMPORT_STAR_REACT_RE.test(l)) + 1;
				if (!hasHarnessAllow(lines, lineNum - 1, "FE-ANIMATE-UI-REGISTRY")) {
					violations.push(
						makeViolation({
							ruleId: "FE-ANIMATE-UI-REGISTRY",
							file: rel,
							line: lineNum,
							message: "检测到未使用的 `import * as React`，Biome 忽略了 packages/ui，但会触发 TS noUnusedLocals 编译失败",
							remediation: "移除未使用的 `import * as React` 导入语句。",
						}),
					);
				}
			}
		}
	}
}

function checkUnsafeBrowserApi(adminFiles, violations) {
	for (const abs of adminFiles) {
		const rel = toRelPosix(abs);
		const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (isCommentLine(line)) continue;

			const dialogMatch = line.match(NATIVE_DIALOG_RE);
			if (dialogMatch && !hasHarnessAllow(lines, i, "FE-NO-UNSAFE-BROWSER-API")) {
				violations.push(
					makeViolation({
						ruleId: "FE-NO-UNSAFE-BROWSER-API",
						file: rel,
						line: i + 1,
						message: `禁止使用原生浏览器弹窗 window.${dialogMatch[1]}()`,
						remediation: "确认交互请使用 `@/hooks/use-confirm`，轻提示请使用 `sonner` 的 `toast`。",
					}),
				);
			}

			if (HARD_LOCATION_RE.test(line) && !hasHarnessAllow(lines, i, "FE-NO-UNSAFE-BROWSER-API")) {
				// 显式允许两处已确认的架构语义点：标签栏主动刷新按钮、routerBridge 未就绪兜底
				const isTagsReload =
					rel === "zev-web/apps/admin/src/layouts/dashboard/tags-view.tsx" &&
					line.includes("window.location.reload()");
				const isSessionFallback =
					rel === "zev-web/apps/admin/src/router/session.ts" &&
					line.includes('window.location.replace("/login")');

				if (!isTagsReload && !isSessionFallback) {
					violations.push(
						makeViolation({
							ruleId: "FE-NO-UNSAFE-BROWSER-API",
							file: rel,
							line: i + 1,
							message: "禁止绕过 SPA 路由桥接直接执行 window.location 硬刷新或跳转",
							remediation: "请使用 `@/router/session` 提供的 syncRouterRoutes / invalidateRouter / clearSessionAndRedirectToLogin。",
						}),
					);
				}
			}
		}
	}
}

function checkStackGuard(violations) {
	const tailwindDirs = [
		"",
		"zev-web",
		"zev-web/apps/admin",
		"zev-web/packages/ui",
	];
	for (const dir of tailwindDirs) {
		for (const ext of ["js", "cjs", "mjs", "ts"]) {
			const rel = dir ? `${dir}/tailwind.config.${ext}` : `tailwind.config.${ext}`;
			if (fs.existsSync(fromRepo(...rel.split("/")))) {
				violations.push(
					makeViolation({
						ruleId: "FE-STACK-GUARD",
						file: rel,
						line: 1,
						message: "ZEV 前端锁定 Tailwind CSS v4，禁止引入 V3 tailwind.config.* 配置文件",
						remediation: "删除该配置文件，使用 CSS `@theme` 变量定义主题。",
					}),
				);
			}
		}
	}

	const componentsJsonPath = fromRepo("zev-web", "apps", "admin", "components.json");
	if (fs.existsSync(componentsJsonPath)) {
		const cfg = JSON.parse(fs.readFileSync(componentsJsonPath, "utf8"));
		if (cfg?.tailwind?.config !== "") {
			violations.push(
				makeViolation({
					ruleId: "FE-STACK-GUARD",
					file: toRelPosix(componentsJsonPath),
					line: 1,
					message: 'components.json 中 tailwind.config 必须为空字符串 ""',
					remediation: '将 components.json 中的 tailwind.config 设为 "" 以保持 Tailwind v4 模式。',
				}),
			);
		}
	}

	for (const pkgRel of ["zev-web/package.json", "zev-web/apps/admin/package.json"]) {
		const pkgPath = fromRepo(...pkgRel.split("/"));
		if (!fs.existsSync(pkgPath)) continue;
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
		if (pkg.dependencies?.vaul || pkg.devDependencies?.vaul) {
			violations.push(
				makeViolation({
					ruleId: "FE-STACK-GUARD",
					file: pkgRel,
					line: 1,
					message: "禁止引入冗余依赖 vaul",
					remediation: "从 package.json 中移除 vaul 依赖。",
				}),
			);
		}
		if (pkgRel === "zev-web/apps/admin/package.json" && pkg.dependencies?.recharts) {
			const major = Number((String(pkg.dependencies.recharts).match(/\d+/) ?? ["0"])[0]);
			if (major < 3) {
				violations.push(
					makeViolation({
						ruleId: "FE-STACK-GUARD",
						file: pkgRel,
						line: 1,
						message: `recharts 版本 (${pkg.dependencies.recharts}) 被降级为 v${major}，禁止低于 v3`,
						remediation: "切勿运行 `shadcn add chart`，请恢复 recharts v3 与现有 `@zev/ui/components/chart`。",
					}),
				);
			}
		}
	}
}
