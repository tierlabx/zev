import fs from "node:fs";
import path from "node:path";
import { fromRepo, lineAtOffset } from "../lib/fs-utils.mjs";
import { makeViolation } from "../lib/reporter.mjs";

/** 检查前后端跨端契约一致性 */
export function runContractChecks() {
	const violations = [];
	checkRouteComponentSync(violations);
	return violations;
}

function collectSeedFiles() {
	const modulesDir = fromRepo("zev-go", "modules");
	if (!fs.existsSync(modulesDir)) {
		return [];
	}
	const files = [];
	for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const candidate = path.join(modulesDir, entry.name, "seed", "seed.json");
		if (fs.existsSync(candidate)) {
			files.push({
				absPath: candidate,
				relPath: `zev-go/modules/${entry.name}/seed/seed.json`,
			});
		}
	}
	return files;
}

function checkRouteComponentSync(violations) {
	const seedFiles = collectSeedFiles();
	const componentsPath = fromRepo("zev-web", "apps", "admin", "src", "router", "components.tsx");
	const staticRoutesPath = fromRepo("zev-web", "apps", "admin", "src", "router", "static-routes.ts");

	if (seedFiles.length === 0 || !fs.existsSync(componentsPath)) {
		return;
	}

	const seedComponents = new Map();
	for (const sf of seedFiles) {
		const seed = JSON.parse(fs.readFileSync(sf.absPath, "utf8"));
		for (const menu of seed.menus ?? []) {
			if (menu.component && menu.component !== "Layout") {
				seedComponents.set(menu.component, sf.relPath);
			}
		}
	}

	const componentsSrc = fs.readFileSync(componentsPath, "utf8");
	const mapMatch = componentsSrc.match(/export\s+const\s+componentMap[\s\S]*?=\s*\{([\s\S]*?)\};/);
	if (!mapMatch) {
		violations.push(
			makeViolation({
				ruleId: "X-ROUTE-COMPONENT-SYNC",
				file: "zev-web/apps/admin/src/router/components.tsx",
				line: 1,
				message: "未在 router/components.tsx 中解析到 componentMap 注册表",
				remediation: "保持 `export const componentMap: Record<string, ComponentType> = { ... };` 导出结构。",
			}),
		);
		return;
	}

	const mapBody = mapMatch[1];
	const mapOffset = componentsSrc.indexOf(mapBody);
	const registered = new Map();
	const keyRe = /["']([^"']+)["']\s*:/g;
	for (const m of mapBody.matchAll(keyRe)) {
		registered.set(m[1], lineAtOffset(componentsSrc, mapOffset + (m.index ?? 0)));
	}

	const staticKeys = new Set();
	if (fs.existsSync(staticRoutesPath)) {
		const staticSrc = fs.readFileSync(staticRoutesPath, "utf8");
		for (const m of staticSrc.matchAll(/componentMap\[["']([^"']+)["']\]/g)) {
			staticKeys.add(m[1]);
		}
	}

	for (const [comp, seedRelPath] of seedComponents.entries()) {
		if (!registered.has(comp)) {
			violations.push(
				makeViolation({
					ruleId: "X-ROUTE-COMPONENT-SYNC",
					severity: "error",
					file: seedRelPath,
					line: 1,
					message: `seed.json 中的页面组件 "${comp}" 未在前端 componentMap 中注册`,
					remediation: `请在 zev-web/apps/admin/src/router/components.tsx 的 componentMap 中添加 "${comp}" 映射。`,
				}),
			);
		}
	}

	for (const [comp, line] of registered.entries()) {
		if (!seedComponents.has(comp) && !staticKeys.has(comp)) {
			violations.push(
				makeViolation({
					ruleId: "X-ROUTE-COMPONENT-SYNC",
					severity: "warn",
					file: "zev-web/apps/admin/src/router/components.tsx",
					line,
					message: `componentMap 中的 "${comp}" 未被 seed.json 菜单或 static-routes.ts 引用`,
					remediation: "请确认是否为遗留孤儿映射，或补充对应菜单/静态路由。",
				}),
			);
		}
	}
}
