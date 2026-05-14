#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const summaryPath = path.resolve(
  cwd,
  process.env.LUIE_WRITING_LOOP_SUMMARY_PATH ??
    "tests/.tmp/e2e-writing-loop-summary.json",
);
const baselinePath = path.resolve(
  cwd,
  "docs/quality/writing-loop-profiles-baseline.json",
);
const updateBaseline = process.argv.includes("--update-baseline");

const readJson = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`JSON file not found: ${targetPath}`);
  }
  return JSON.parse(fs.readFileSync(targetPath, "utf8"));
};

const readSummaryMetrics = (summary) => {
  const metricsByProfile = {};
  for (const item of summary?.results ?? []) {
    if (!item?.profile) continue;
    metricsByProfile[item.profile] = {
      saveP95Ms: Number(item?.metrics?.saveP95Ms ?? NaN),
      saveP99Ms: Number(item?.metrics?.saveP99Ms ?? NaN),
      queueDrainMs: Number(item?.metrics?.queueDrainMs ?? NaN),
      exitCode: item?.exitCode,
    };
  }
  return metricsByProfile;
};

const validateMetric = (name, value) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${name}: ${String(value)}`);
  }
};

const ensureProfilesPassed = (metricsByProfile) => {
  const failed = Object.entries(metricsByProfile).filter(
    ([, metrics]) => metrics.exitCode !== 0,
  );
  if (failed.length > 0) {
    throw new Error(
      `Profile test failed: ${failed.map(([name, metrics]) => `${name}(exit=${String(metrics.exitCode)})`).join(", ")}`,
    );
  }
};

const checkRegression = (baseline, current) => {
  const violations = [];
  const keys = ["saveP95Ms", "saveP99Ms", "queueDrainMs"];
  const rules = {
    saveP95Ms: { ratio: 1.8, delta: 50 },
    saveP99Ms: { ratio: 2.0, delta: 150 },
    queueDrainMs: { ratio: 2.0, delta: 2000 },
  };

  for (const [profile, baselineMetrics] of Object.entries(baseline)) {
    const currentMetrics = current[profile];
    if (!currentMetrics) {
      violations.push(`missing profile in summary: ${profile}`);
      continue;
    }
    for (const key of keys) {
      const baseValue = Number(baselineMetrics[key]);
      const currentValue = Number(currentMetrics[key]);
      validateMetric(`${profile}.${key}.baseline`, baseValue);
      validateMetric(`${profile}.${key}.current`, currentValue);
      const threshold = Math.max(
        baseValue * rules[key].ratio,
        baseValue + rules[key].delta,
      );
      if (baseValue > 0 && currentValue > threshold) {
        violations.push(
          `${profile}.${key} regression: baseline=${baseValue.toFixed(2)} current=${currentValue.toFixed(2)} threshold=${threshold.toFixed(2)}`,
        );
      }
    }
  }
  return violations;
};

const writeBaseline = (summary, metricsByProfile) => {
  const payload = {
    schemaVersion: 1,
    updatedAt: summary?.generatedAt ?? new Date().toISOString(),
    profiles: {},
  };
  for (const [profile, metrics] of Object.entries(metricsByProfile)) {
    validateMetric(`${profile}.saveP95Ms`, metrics.saveP95Ms);
    validateMetric(`${profile}.saveP99Ms`, metrics.saveP99Ms);
    validateMetric(`${profile}.queueDrainMs`, metrics.queueDrainMs);
    payload.profiles[profile] = {
      saveP95Ms: metrics.saveP95Ms,
      saveP99Ms: metrics.saveP99Ms,
      queueDrainMs: metrics.queueDrainMs,
    };
  }
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const main = () => {
  const summary = readJson(summaryPath);
  const metricsByProfile = readSummaryMetrics(summary);
  ensureProfilesPassed(metricsByProfile);

  if (updateBaseline) {
    writeBaseline(summary, metricsByProfile);
    console.log(`[check-writing-loop-profiles-regression] baseline updated: ${baselinePath}`);
    return;
  }

  const baseline = readJson(baselinePath);
  const violations = checkRegression(
    baseline?.profiles ?? {},
    metricsByProfile,
  );
  if (violations.length > 0) {
    console.error("[check-writing-loop-profiles-regression] regressions detected:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }

  console.log("[check-writing-loop-profiles-regression] OK");
};

try {
  main();
} catch (error) {
  console.error("[check-writing-loop-profiles-regression] failed:", error);
  process.exit(1);
}
