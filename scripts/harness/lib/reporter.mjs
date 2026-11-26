/** 构造标准违规记录 */
export function makeViolation({ ruleId, severity = "error", file, line = 1, message, remediation }) {
	return { ruleId, severity, file, line, message, remediation };
}

/** 统计各级违规数量 */
export function summarizeViolations(violations) {
	let errors = 0;
	let warnings = 0;
	let infos = 0;
	for (const v of violations) {
		if (v.severity === "error") errors++;
		else if (v.severity === "warn") warnings++;
		else infos++;
	}
	return { total: violations.length, errors, warnings, infos };
}

/** 打印检查结果（支持 --json 与人类可读格式） */
export function printReport(title, violations, { json = false, durationMs = 0 } = {}) {
	const summary = summarizeViolations(violations);

	if (json) {
		console.log(
			JSON.stringify(
				{
					title,
					durationMs,
					summary,
					violations,
				},
				null,
				2,
			),
		);
		return summary;
	}

	if (violations.length === 0) {
		console.log(`PASS ${title} (0 violations, ${durationMs}ms)`);
		return summary;
	}

	for (const v of violations) {
		const loc = v.line > 0 ? `${v.file}:${v.line}` : v.file;
		console.log(`[${v.severity.toUpperCase()}] ${v.ruleId} (${loc})`);
		console.log(`  原因: ${v.message}`);
		if (v.remediation) {
			console.log(`  修复: ${v.remediation}`);
		}
	}

	console.log(
		`\n${title} 完成: ${summary.errors} error, ${summary.warnings} warn, ${summary.infos} info (${durationMs}ms)`,
	);
	return summary;
}
