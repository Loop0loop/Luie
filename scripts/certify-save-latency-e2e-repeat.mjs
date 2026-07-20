#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const runs = Number.parseInt(readArg("--runs", "3"), 10);
const summaryPath = path.resolve(
  readArg("--out", "tests/.tmp/save-latency-e2e-certification-summary.json"),
);
const shouldBuild = !args.includes("--skip-build");

if (!Number.isInteger(runs) || runs < 3) {
  throw new Error("E2E save latency certification requires at least three runs.");
}

const sourceFiles = [
  "scripts/certify-save-latency-e2e-repeat.mjs",
  "src/renderer/src/features/workspace/services/saveCoordinator.ts",
  "src/shared/performance/saveLatencyStatistics.ts",
  "tests/e2e/saveLatencyCertification.spec.ts",
];
const sourceHash = createHash("sha256");
for (const sourceFile of sourceFiles) {
  sourceHash.update(sourceFile);
  sourceHash.update(fs.readFileSync(path.resolve(sourceFile)));
}
const harnessSha256 = sourceHash.digest("hex");
const gitHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();

if (shouldBuild) {
  const build = spawnSync(
    process.execPath,
    ["node_modules/electron-vite/bin/electron-vite.js", "build"],
    { cwd: process.cwd(), env: process.env, stdio: "inherit", shell: false },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const extension = path.extname(summaryPath);
const basename = summaryPath.slice(0, -extension.length);
const runReports = [];

for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
  const reportPath = `${basename}-run-${runIndex}${extension}`;
  fs.rmSync(reportPath, { force: true });
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--project=e2e",
      "tests/e2e/saveLatencyCertification.spec.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LUIE_SAVE_LATENCY_E2E_REPORT_PATH: reportPath,
        LUIE_SAVE_LATENCY_GIT_HEAD: gitHead,
        LUIE_SAVE_LATENCY_SOURCE_HASH: harnessSha256,
      },
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  runReports.push({
    run: runIndex,
    artifact: path.relative(process.cwd(), reportPath),
    generatedAt: report.generatedAt,
    source: report.source,
    environment: report.environment,
    scenario: report.scenario,
    failureCount: report.failureCount,
    failureRate: report.failureRate,
    statistics: report.statistics,
    p95ConfidenceInterval95: report.p95ConfidenceInterval95,
    integrity: report.integrity,
  });
}

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  runCount: runReports.length,
  runs: runReports,
};
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`[save-latency:e2e] repeat summary: ${summaryPath}`);
