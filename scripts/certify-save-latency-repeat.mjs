#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const runs = Number.parseInt(readArg("--runs", "3"), 10);
const summaryPath = path.resolve(
  readArg("--out", "tests/.tmp/save-latency-certification-summary.json"),
);
if (!Number.isInteger(runs) || runs < 3) {
  throw new Error("Save latency certification requires at least three runs.");
}

const extension = path.extname(summaryPath);
const basename = summaryPath.slice(0, -extension.length);
const runReports = [];

for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
  const reportPath = `${basename}-run-${runIndex}${extension}`;
  const result = spawnSync(
    process.execPath,
    ["scripts/certify-save-latency.mjs", "--out", reportPath],
    { cwd: process.cwd(), env: process.env, stdio: "inherit", shell: false },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  runReports.push({
    run: runIndex,
    artifact: path.relative(process.cwd(), reportPath),
    generatedAt: report.generatedAt,
    source: report.source,
    environment: report.environment,
    fixture: report.fixture,
    scenarios: report.scenarios.map((scenario) => ({
      name: scenario.name,
      sampleCount: scenario.sampleCount,
      failureCount: scenario.failureCount,
      failureRate: scenario.failureRate,
      latencyMs: scenario.latencyMs,
    })),
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
console.log(`[save-latency] repeat summary: ${summaryPath}`);
