#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outPath = path.resolve(
  outIndex >= 0 && args[outIndex + 1]
    ? args[outIndex + 1]
    : "tests/.tmp/save-latency-certification.json",
);
const electronBin = path.resolve(
  process.platform === "win32"
    ? "node_modules/.bin/electron.cmd"
    : "node_modules/.bin/electron",
);
const vitestEntry = path.resolve("node_modules/vitest/vitest.mjs");
const sourceFiles = [
  "scripts/certify-save-latency.mjs",
  "src/renderer/src/features/workspace/services/saveCoordinator.ts",
  "src/shared/performance/saveLatencyStatistics.ts",
  "tests/main/performance/saveLatencyCertification.test.ts",
  "tests/shared/performance/saveLatencyStatistics.test.ts",
];
const sourceHash = createHash("sha256");
for (const sourceFile of sourceFiles) {
  sourceHash.update(sourceFile);
  sourceHash.update(fs.readFileSync(path.resolve(sourceFile)));
}
const gitHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
fs.rmSync(outPath, { force: true });

const run = spawnSync(
  electronBin,
  [
    vitestEntry,
    "run",
    "--no-file-parallelism",
    "--silent=true",
    "--reporter=verbose",
    "tests/main/performance/saveLatencyCertification.test.ts",
  ],
  {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      LUIE_SAVE_LATENCY_REPORT_PATH: outPath,
      LUIE_SAVE_LATENCY_GIT_HEAD: gitHead,
      LUIE_SAVE_LATENCY_SOURCE_HASH: sourceHash.digest("hex"),
    },
    stdio: "inherit",
    shell: false,
  },
);

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}
if (!fs.existsSync(outPath)) {
  throw new Error(`Save latency report was not created: ${outPath}`);
}

const report = JSON.parse(fs.readFileSync(outPath, "utf8"));
for (const scenario of report.scenarios ?? []) {
  const latency = scenario.latencyMs;
  console.log(
    `[save-latency] ${scenario.name} p95=${latency.p95Ms}ms ` +
      `CI95=${latency.p95ConfidenceInterval.lowerMs}-${latency.p95ConfidenceInterval.upperMs}ms ` +
      `failures=${scenario.failureCount}/${scenario.sampleCount}`,
  );
}
console.log(`[save-latency] report: ${outPath}`);
