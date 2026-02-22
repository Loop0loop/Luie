#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";

const THRESHOLD = 18;
const TARGET_FILES = [
  "src/main/services/features/syncService.ts",
  "src/main/services/core/projectService.ts",
  "src/renderer/src/features/workspace/components/ProjectTemplateSelector.tsx",
];

const args = [
  "-s",
  "eslint",
  ...TARGET_FILES,
  "--format",
  "json",
  "--rule",
  `complexity:[\"warn\",${THRESHOLD}]`,
];

const result = spawnSync("pnpm", args, {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (!result.stdout) {
  console.error(result.stderr || "[check-core-complexity] eslint produced no output");
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout);
} catch (error) {
  console.error("[check-core-complexity] Failed to parse eslint JSON output");
  console.error(result.stdout);
  console.error(result.stderr);
  console.error(error);
  process.exit(1);
}

const findings = [];
for (const fileResult of parsed) {
  for (const message of fileResult.messages ?? []) {
    if (message.ruleId !== "complexity") continue;
    findings.push({
      file: path.relative(process.cwd(), fileResult.filePath),
      line: message.line,
      message: message.message,
    });
  }
}

if (findings.length > 0) {
  console.error(
    `[check-core-complexity] Complexity threshold exceeded (>${THRESHOLD}) in core files:`,
  );
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
  }
  process.exit(1);
}

if (result.status !== 0) {
  console.error(result.stderr || "[check-core-complexity] eslint failed");
  process.exit(result.status ?? 1);
}

console.log(`[check-core-complexity] OK (threshold <= ${THRESHOLD})`);
