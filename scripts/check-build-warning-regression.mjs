#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASELINE_PATH = path.resolve(
  process.cwd(),
  "docs/quality/build-warning-baseline.json",
);

const UPDATE_BASELINE_FLAG = "--update-baseline";

const runBuild = async () => {
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(pnpmCommand, ["-s", "build"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  let combinedOutput = "";

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    combinedOutput += text;
    process.stdout.write(text);
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    combinedOutput += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  return {
    exitCode: Number(exitCode ?? 1),
    output: combinedOutput,
  };
};

const extractWarningLines = (output) => {
  const warnings = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("(!)"))
    .map((line) => line.replace(/^\(!\)\s*/, ""));

  return [...new Set(warnings)];
};

const readBaseline = async () => {
  const raw = await readFile(BASELINE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.warnings)) {
    throw new Error("Baseline JSON is missing `warnings` array");
  }
  return parsed.warnings;
};

const writeBaseline = async (warnings) => {
  const payload = {
    updatedAt: new Date().toISOString(),
    warnings,
  };
  await writeFile(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const diffWarnings = (baseline, current) => {
  const baselineSet = new Set(baseline);
  const currentSet = new Set(current);
  const added = current.filter((warning) => !baselineSet.has(warning));
  const removed = baseline.filter((warning) => !currentSet.has(warning));
  return { added, removed };
};

const main = async () => {
  const shouldUpdateBaseline = process.argv.includes(UPDATE_BASELINE_FLAG);

  const buildResult = await runBuild();
  if (buildResult.exitCode !== 0) {
    process.exit(buildResult.exitCode);
  }

  const currentWarnings = extractWarningLines(buildResult.output);
  if (shouldUpdateBaseline) {
    await writeBaseline(currentWarnings);
    console.log(
      `[check-build-warning-regression] baseline updated (${currentWarnings.length} warnings).`,
    );
    return;
  }

  const baselineWarnings = await readBaseline();
  const { added, removed } = diffWarnings(baselineWarnings, currentWarnings);

  if (added.length > 0) {
    console.error("[check-build-warning-regression] new build warnings detected:");
    added.forEach((warning) => console.error(`- ${warning}`));
    process.exit(1);
  }

  if (removed.length > 0) {
    console.warn(
      `[check-build-warning-regression] warnings removed from baseline: ${removed.length}`,
    );
    removed.forEach((warning) => console.warn(`- ${warning}`));
  }

  console.log(
    `[check-build-warning-regression] OK (${currentWarnings.length} warnings, no regressions).`,
  );
};

main().catch((error) => {
  console.error(
    "[check-build-warning-regression] failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
