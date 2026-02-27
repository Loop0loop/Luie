#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";

const TARGET_FILES = [
  "src/main/services/features/syncService.ts",
  "src/main/services/core/projectService.ts",
  "src/renderer/src/features/workspace/components/ProjectTemplateSelector.tsx",
];

const RULE_OVERRIDES = [
  `complexity:["warn",18]`,
  `max-depth:["warn",5]`,
  `max-lines-per-function:["warn",{"max":220,"skipBlankLines":true,"skipComments":true}]`,
  `no-await-in-loop:["warn"]`,
];

const TARGET_RULE_IDS = new Set([
  "complexity",
  "max-depth",
  "max-lines-per-function",
  "no-await-in-loop",
]);
const BLOCKING_RULE_IDS = new Set(["complexity", "max-depth"]);

const args = [
  "-s",
  "eslint",
  ...TARGET_FILES,
  "--format",
  "json",
];

for (const rule of RULE_OVERRIDES) {
  args.push("--rule", rule);
}

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

const blockingFindings = [];
const advisoryFindings = [];
for (const fileResult of parsed) {
  for (const message of fileResult.messages ?? []) {
    if (!TARGET_RULE_IDS.has(message.ruleId)) continue;
    const finding = {
      file: path.relative(process.cwd(), fileResult.filePath),
      line: message.line,
      ruleId: message.ruleId,
      message: message.message,
    };
    if (BLOCKING_RULE_IDS.has(message.ruleId)) {
      blockingFindings.push(finding);
    } else {
      advisoryFindings.push(finding);
    }
  }
}

if (advisoryFindings.length > 0) {
  console.warn(
    `[check-core-complexity] advisory findings: ${advisoryFindings.length}`,
  );
  for (const finding of advisoryFindings) {
    console.warn(
      `- ${finding.file}:${finding.line} [${finding.ruleId}] ${finding.message}`,
    );
  }
}

if (blockingFindings.length > 0) {
  console.error("[check-core-complexity] Core performance/complexity rules violated:");
  for (const finding of blockingFindings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.ruleId}] ${finding.message}`,
    );
  }
  process.exit(1);
}

if (result.status !== 0) {
  console.error(result.stderr || "[check-core-complexity] eslint failed");
  process.exit(result.status ?? 1);
}

console.log("[check-core-complexity] OK");
