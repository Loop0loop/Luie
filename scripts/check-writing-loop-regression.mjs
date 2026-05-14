#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const baselinePath = path.resolve(cwd, "docs/quality/writing-loop-baseline.json");
const reportPath = path.resolve(
  cwd,
  process.env.LUIE_WRITING_LOOP_REPORT_PATH ??
    "tests/.tmp/e2e-writing-loop-bench-custom.json",
);
const updateBaseline = process.argv.includes("--update-baseline");

const readJson = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`JSON file not found: ${targetPath}`);
  }
  const raw = fs.readFileSync(targetPath, "utf8");
  return JSON.parse(raw);
};

const toMetrics = (report) => ({
  saveP95Ms: Number(report?.saveLatencyMs?.p95 ?? NaN),
  saveP99Ms: Number(report?.saveLatencyMs?.p99 ?? NaN),
  queueDrainMs: Number(report?.derivedStatus?.queueDrainMs ?? NaN),
});

const validateMetrics = (metrics) => {
  for (const [key, value] of Object.entries(metrics)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid metric ${key}: ${String(value)}`);
    }
  }
};

const ensureNoFailures = (report) => {
  const searchFailed = Number(report?.derivedStatus?.search?.failedCount ?? 0);
  const memoryFailed = Number(report?.derivedStatus?.memory?.failedCount ?? 0);
  if (searchFailed > 0 || memoryFailed > 0) {
    throw new Error(
      `Derived failure counts must be zero (search=${searchFailed}, memory=${memoryFailed})`,
    );
  }
};

const checkRegression = (baseline, current) => {
  const violations = [];
  const rules = [
    {
      key: "saveP95Ms",
      ratio: 1.8,
      delta: 50,
    },
    {
      key: "saveP99Ms",
      ratio: 2.0,
      delta: 150,
    },
    {
      key: "queueDrainMs",
      ratio: 2.0,
      delta: 1500,
    },
  ];

  for (const rule of rules) {
    const base = baseline[rule.key];
    const next = current[rule.key];
    const threshold = Math.max(base * rule.ratio, base + rule.delta);
    if (next > threshold) {
      violations.push(
        `${rule.key} regression: baseline=${base.toFixed(2)} current=${next.toFixed(2)} threshold=${threshold.toFixed(2)}`,
      );
    }
  }

  return violations;
};

const writeBaseline = (report, metrics) => {
  const payload = {
    schemaVersion: 1,
    updatedAt:
      report?.derivedStatus?.memory?.lastProcessedAt ??
      report?.derivedStatus?.search?.lastProcessedAt ??
      new Date().toISOString(),
    profile: process.env.LUIE_STRESS_PROFILE ?? "custom",
    dataset: {
      chapters: Number(report?.dataset?.chapters ?? 0),
      contentSize: Number(report?.dataset?.contentSize ?? 0),
      burstOps: Number(report?.dataset?.burstOps ?? 0),
    },
    metrics,
  };
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const main = () => {
  const report = readJson(reportPath);
  ensureNoFailures(report);
  const currentMetrics = toMetrics(report);
  validateMetrics(currentMetrics);

  if (updateBaseline) {
    writeBaseline(report, currentMetrics);
    console.log(`[check-writing-loop-regression] baseline updated: ${baselinePath}`);
    return;
  }

  const baseline = readJson(baselinePath);
  const baselineMetrics = {
    saveP95Ms: Number(baseline?.metrics?.saveP95Ms ?? NaN),
    saveP99Ms: Number(baseline?.metrics?.saveP99Ms ?? NaN),
    queueDrainMs: Number(baseline?.metrics?.queueDrainMs ?? NaN),
  };
  validateMetrics(baselineMetrics);

  const violations = checkRegression(baselineMetrics, currentMetrics);
  if (violations.length > 0) {
    console.error("[check-writing-loop-regression] regressions detected:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    `[check-writing-loop-regression] OK p95=${currentMetrics.saveP95Ms.toFixed(2)} p99=${currentMetrics.saveP99Ms.toFixed(2)} queueDrain=${currentMetrics.queueDrainMs.toFixed(2)}`,
  );
};

try {
  main();
} catch (error) {
  console.error("[check-writing-loop-regression] failed:", error);
  process.exit(1);
}
