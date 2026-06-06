#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const defaultOutputPath = path.join(cwd, "tests", ".tmp", "luie-resilience-report.json");
const repeatSummaryPath = path.join(cwd, "tests", ".tmp", "e2e-writing-loop-repeat-summary.json");
const fullprodSummaryPath = path.join(cwd, "tests", ".tmp", "e2e-writing-loop-fullprod-repeat-summary.json");
const queueDrainSmallPath = path.join(
  cwd,
  "tests",
  ".tmp",
  "e2e-writing-loop-fullprod-queue-drain-small.json",
);
const queueDrainLargePath = path.join(
  cwd,
  "tests",
  ".tmp",
  "e2e-writing-loop-fullprod-queue-drain-large-fallback-summary.json",
);

const directResilienceVitestTargets = [
  "tests/main/services/luieContainer.test.ts",
  "tests/main/services/luieContainer.extreme.test.ts",
  "tests/main/services/luiePackageWriter.rollback.test.ts",
  "tests/main/services/luieDbLossRecovery.test.ts",
  "tests/main/handler/ipcFsHandlers.luieMigration.test.ts",
  "tests/scripts/packageDurabilityBoundary.test.ts",
];

const recoveryMockVitestTargets = [
  "tests/main/services/dbRecoveryService.test.ts",
];

const recoveryRealDbVitestTargets = [
  {
    id: "resilience-vitest-project-service",
    path: "tests/main/services/projectService.test.ts",
  },
  {
    id: "resilience-vitest-snapshot",
    path: "tests/main/services/snapshotResilience.test.ts",
  },
];

const toFiniteNumber = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const readJsonIfExists = (targetPath) => {
  if (!fs.existsSync(targetPath)) return null;
  return JSON.parse(fs.readFileSync(targetPath, "utf8"));
};

const numberValues = (items, selector) =>
  items
    .map(selector)
    .map(toFiniteNumber)
    .filter((value) => value !== null);

const minOrNull = (values) => (values.length > 0 ? Math.min(...values) : null);
const maxOrNull = (values) => (values.length > 0 ? Math.max(...values) : null);
const sum = (values) => values.reduce((total, value) => total + value, 0);

export function summarizeWritingLoopSummary(summary) {
  if (!summary || !Array.isArray(summary.results)) {
    return { available: false };
  }
  const results = summary.results;
  const p95Values = numberValues(results, (item) => item?.metrics?.p95);
  const p99Values = numberValues(results, (item) => item?.metrics?.p99);
  const maxValues = numberValues(results, (item) => item?.metrics?.max);
  const above1000Values = numberValues(results, (item) => item?.metrics?.above1000msCount);
  const passCount = results.filter((item) => item?.pass === true && item?.exitCode === 0).length;

  return {
    available: true,
    generatedAt: summary.generatedAt ?? null,
    config: summary.config ?? null,
    totalRuns: results.length,
    passCount,
    allPassed: results.length > 0 && passCount === results.length,
    latency: {
      p95MinMs: minOrNull(p95Values),
      p95MaxMs: maxOrNull(p95Values),
      p99MinMs: minOrNull(p99Values),
      p99MaxMs: maxOrNull(p99Values),
      maxMs: maxOrNull(maxValues),
      above1000msTotal: sum(above1000Values),
    },
    profiles: results.map((item) => ({
      profile: item?.profile ?? null,
      pass: item?.pass === true,
      exitCode: item?.exitCode ?? null,
      metrics: item?.metrics ?? null,
      reportPath: item?.reportPath ?? null,
    })),
  };
}

export function summarizeFullprodReports(summary, reports) {
  if (!summary || !Array.isArray(summary.results)) {
    return { available: false };
  }
  const results = summary.results;
  const p95Values = numberValues(results, (item) => item?.metrics?.p95);
  const p99Values = numberValues(results, (item) => item?.metrics?.p99);
  const maxValues = numberValues(results, (item) => item?.metrics?.max);
  const queueDrainValues = numberValues(results, (item) => item?.metrics?.queueDrainMs);
  const searchFailedValues = numberValues(reports, (item) => item?.derivedStatus?.search?.failedCount);
  const memoryFailedValues = numberValues(reports, (item) => item?.derivedStatus?.memory?.failedCount);
  const searchPendingValues = numberValues(reports, (item) => item?.derivedStatus?.search?.pendingCount);
  const memoryPendingValues = numberValues(reports, (item) => item?.derivedStatus?.memory?.pendingCount);
  const passCount = results.filter((item) => item?.pass === true && item?.exitCode === 0).length;
  const searchFailedMax = maxOrNull(searchFailedValues);
  const memoryFailedMax = maxOrNull(memoryFailedValues);

  return {
    available: true,
    generatedAt: summary.generatedAt ?? null,
    config: summary.config ?? null,
    totalRuns: results.length,
    passCount,
    allPassed: results.length > 0 && passCount === results.length,
    latency: {
      p95MinMs: minOrNull(p95Values),
      p95MaxMs: maxOrNull(p95Values),
      p99MinMs: minOrNull(p99Values),
      p99MaxMs: maxOrNull(p99Values),
      maxMs: maxOrNull(maxValues),
      queueDrainMaxMs: maxOrNull(queueDrainValues),
    },
    derivedFailures: {
      searchFailedMax,
      memoryFailedMax,
      failureFree: (searchFailedMax ?? 0) === 0 && (memoryFailedMax ?? 0) === 0,
    },
    pendingQueues: {
      searchPendingMax: maxOrNull(searchPendingValues),
      memoryPendingMax: maxOrNull(memoryPendingValues),
    },
    profiles: results.map((item, index) => ({
      profile: item?.profile ?? null,
      pass: item?.pass === true,
      exitCode: item?.exitCode ?? null,
      metrics: item?.metrics ?? null,
      reportPath: item?.reportPath ?? null,
      derivedStatus: reports[index]?.derivedStatus ?? null,
    })),
  };
}

export function summarizeQueueDrainReport(report) {
  if (!report || !report.derivedStatus) {
    return { available: false };
  }
  const search = report.derivedStatus.search ?? null;
  const memory = report.derivedStatus.memory ?? null;
  const summary = report.derivedStatus.summary ?? null;
  const embedding = report.derivedStatus.embedding ?? null;
  const searchPending = toFiniteNumber(search?.pendingCount);
  const searchRunning = toFiniteNumber(search?.runningCount);
  const memoryPending = toFiniteNumber(memory?.pendingCount);
  const memoryRunning = toFiniteNumber(memory?.runningCount);
  const searchFailed = toFiniteNumber(search?.failedCount);
  const memoryFailed = toFiniteNumber(memory?.failedCount);
  const summaryPending = toFiniteNumber(summary?.pendingCount);
  const summaryRunning = toFiniteNumber(summary?.runningCount);
  const summaryFailed = toFiniteNumber(summary?.failedCount);
  const embeddingPending = toFiniteNumber(embedding?.pendingCount);
  const embeddingRunning = toFiniteNumber(embedding?.runningCount);
  const embeddingFailed = toFiniteNumber(embedding?.failedCount);

  return {
    available: true,
    dataset: report.dataset ?? null,
    queueDrainMs: toFiniteNumber(report.derivedStatus.queueDrainMs),
    drained:
      searchPending === 0 &&
      searchRunning === 0 &&
      memoryPending === 0 &&
      memoryRunning === 0 &&
      (summaryPending === null || summaryPending === 0) &&
      (summaryRunning === null || summaryRunning === 0) &&
      (embeddingPending === null || embeddingPending === 0) &&
      (embeddingRunning === null || embeddingRunning === 0),
    failureFree:
      (searchFailed ?? 0) === 0 &&
      (memoryFailed ?? 0) === 0 &&
      (summaryFailed ?? 0) === 0 &&
      (embeddingFailed ?? 0) === 0,
    search: {
      pendingCount: searchPending,
      runningCount: searchRunning,
      failedCount: searchFailed,
    },
    memory: {
      pendingCount: memoryPending,
      runningCount: memoryRunning,
      failedCount: memoryFailed,
    },
    summary: summary
      ? {
          pendingCount: summaryPending,
          runningCount: summaryRunning,
          failedCount: summaryFailed,
          completedCount: toFiniteNumber(summary.completedCount),
        }
      : null,
    embedding: embedding
      ? {
          pendingCount: embeddingPending,
          runningCount: embeddingRunning,
          failedCount: embeddingFailed,
          completedCount: toFiniteNumber(embedding.completedCount),
          skippedCount: toFiniteNumber(embedding.skippedCount),
        }
      : null,
    latency: report.saveLatencyMs ?? null,
  };
}

export function buildResilienceReport(input) {
  const repeat = input.repeatSummary ?? { available: false };
  const fullprod = input.fullprodSummary ?? { available: false };
  const queueDrainSmall = input.queueDrainSmallSummary ?? { available: false };
  const queueDrainLarge = input.queueDrainLargeSummary ?? { available: false };
  const searchPendingMax = fullprod?.pendingQueues?.searchPendingMax ?? null;
  const memoryPendingMax = fullprod?.pendingQueues?.memoryPendingMax ?? null;
  const queueEmpty = searchPendingMax === 0 && memoryPendingMax === 0;
  const commandPassed = (id) =>
    input.commandResults?.some((item) => item.id === id && item.exitCode === 0) === true;
  const corruptionAndRollbackPassed = commandPassed("resilience-vitest-direct");
  const snapshotAndRecoveryPassed =
    commandPassed("resilience-vitest-db-recovery") &&
    commandPassed("resilience-vitest-project-service") &&
    commandPassed("resilience-vitest-snapshot");

  const assessments = [
    {
      id: "canonical_write_stability",
      status:
        repeat.available &&
        fullprod.available &&
        repeat.allPassed === true &&
        fullprod.allPassed === true
          ? "passed"
          : "not_proven",
      metric: {
        repeatAllPassed: repeat.allPassed ?? false,
        fullprodAllPassed: fullprod.allPassed ?? false,
      },
    },
    {
      id: "derived_job_failure_free",
      status: fullprod?.derivedFailures?.failureFree === true ? "passed" : "not_proven",
      metric: fullprod?.derivedFailures ?? null,
    },
    {
      id: "background_queue_drain",
      status: queueEmpty ? "passed" : "observed_pending",
      metric: {
        searchPendingMax,
        memoryPendingMax,
      },
    },
    {
      id: "background_queue_drain_small_fullprod",
      status:
        queueDrainSmall.available &&
        queueDrainSmall.drained === true &&
        queueDrainSmall.failureFree === true
          ? "passed"
          : "not_proven",
      metric: queueDrainSmall,
    },
    {
      id: "background_queue_drain_large_fullprod",
      status:
        queueDrainLarge.available &&
        queueDrainLarge.drained === true &&
        queueDrainLarge.failureFree === true
          ? "passed"
          : "not_proven",
      metric: queueDrainLarge,
    },
    {
      id: "corruption_and_rollback_coverage",
      status: corruptionAndRollbackPassed ? "passed" : "not_run_in_this_report",
      metric: {
        suites: directResilienceVitestTargets,
      },
    },
    {
      id: "snapshot_and_recovery_regression_coverage",
      status: snapshotAndRecoveryPassed ? "passed" : "not_run_in_this_report",
      metric: {
        suites: [
          ...recoveryMockVitestTargets,
          ...recoveryRealDbVitestTargets.map((target) => target.path),
        ],
      },
    },
  ];

  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    commandResults: input.commandResults ?? [],
    summaries: {
      writingLoopRepeat: repeat,
      writingLoopFullprod: fullprod,
      writingLoopFullprodQueueDrainSmall: queueDrainSmall,
      writingLoopFullprodQueueDrainLarge: queueDrainLarge,
    },
    assessments,
  };
}

const runCommand = (id, command, args, options = {}) => {
  const startedAt = Date.now();
  console.log(`[luie-resilience] ${id}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: "inherit",
    shell: false,
  });
  return {
    id,
    command,
    args,
    exitCode: result.status ?? null,
    signal: result.signal ?? null,
    durationMs: Date.now() - startedAt,
  };
};

const collectFullprodReports = (summary) => {
  if (!summary || !Array.isArray(summary.results)) return [];
  return summary.results.map((item) => {
    const reportPath = item?.reportPath;
    if (typeof reportPath !== "string") return null;
    return readJsonIfExists(reportPath);
  });
};

const main = () => {
  const args = new Set(process.argv.slice(2));
  const runAll = args.has("--run-all");
  const runVitest = runAll || args.has("--run-vitest");
  const runRepeat = runAll || args.has("--run-repeat");
  const runFullprod = runAll || args.has("--run-fullprod");
  const runQueueDrain = runAll || args.has("--run-queue-drain");
  const skipNativeRebuild = args.has("--skip-native-rebuild");
  const outputArgIndex = process.argv.indexOf("--output");
  const outputPath = outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? path.resolve(cwd, process.argv[outputArgIndex + 1])
    : defaultOutputPath;
  const commandResults = [];

  if (runVitest && !skipNativeRebuild) {
    commandResults.push(
      runCommand("node-sqlite-rebuild", "pnpm", ["rebuild", "better-sqlite3"]),
    );
  }
  if (runVitest) {
    commandResults.push(
      runCommand("resilience-vitest-direct", "pnpm", [
        "vitest",
        ...directResilienceVitestTargets,
      ]),
    );
    commandResults.push(
      runCommand("resilience-vitest-db-recovery", "pnpm", [
        "vitest",
        ...recoveryMockVitestTargets,
      ], { env: { SKIP_DB_TEST_SETUP: "1" } }),
    );
    for (const target of recoveryRealDbVitestTargets) {
      commandResults.push(
        runCommand(target.id, "pnpm", [
          "vitest",
          target.path,
        ]),
      );
    }
  }
  if ((runRepeat || runFullprod || runQueueDrain) && runVitest) {
    commandResults.push(runCommand("electron-sqlite-rebuild", "pnpm", ["run", "rebuild:electron"]));
  }
  if (runRepeat || runFullprod || runQueueDrain) {
    commandResults.push(runCommand("build", "pnpm", ["build"]));
  }
  if (runRepeat) {
    commandResults.push(runCommand("writing-loop-repeat", "pnpm", ["run", "bench:writing-loop:repeat"]));
  }
  if (runFullprod) {
    commandResults.push(
      runCommand("writing-loop-fullprod-repeat", "pnpm", [
        "run",
        "bench:writing-loop:fullprod:repeat",
      ]),
    );
  }
  if (runQueueDrain) {
    commandResults.push(
      runCommand("writing-loop-fullprod-queue-drain-small", "pnpm", [
        "exec",
        "playwright",
        "test",
        "--project=stress",
        "tests/e2e/writingLoop.fullprod.spec.ts",
      ], {
        env: {
          LUIE_FULLPROD_PROFILE: "queue-drain-small",
          LUIE_FULLPROD_CHAPTERS: "20",
          LUIE_FULLPROD_BURST_OPS: "20",
          LUIE_FULLPROD_MAX_WAIT_MS: "180000",
          LUIE_FULLPROD_TEST_TIMEOUT_MS: "240000",
        },
      }),
    );
    commandResults.push(
      runCommand("writing-loop-fullprod-queue-drain-large", "pnpm", [
        "exec",
        "playwright",
        "test",
        "--project=stress",
        "tests/e2e/writingLoop.fullprod.spec.ts",
      ], {
        env: {
          LUIE_FULLPROD_PROFILE: "queue-drain-large-fallback-summary",
          LUIE_FULLPROD_CHAPTERS: "300",
          LUIE_FULLPROD_BURST_OPS: "600",
          LUIE_FULLPROD_MAX_WAIT_MS: "120000",
          LUIE_FULLPROD_TEST_TIMEOUT_MS: "240000",
        },
      }),
    );
  }

  const repeatRaw = readJsonIfExists(repeatSummaryPath);
  const fullprodRaw = readJsonIfExists(fullprodSummaryPath);
  const queueDrainSmallRaw = readJsonIfExists(queueDrainSmallPath);
  const queueDrainLargeRaw = readJsonIfExists(queueDrainLargePath);
  const report = buildResilienceReport({
    generatedAt: new Date().toISOString(),
    commandResults,
    repeatSummary: summarizeWritingLoopSummary(repeatRaw),
    fullprodSummary: summarizeFullprodReports(fullprodRaw, collectFullprodReports(fullprodRaw)),
    queueDrainSmallSummary: summarizeQueueDrainReport(queueDrainSmallRaw),
    queueDrainLargeSummary: summarizeQueueDrainReport(queueDrainLargeRaw),
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[luie-resilience] report written: ${outputPath}`);

  const failedCommand = commandResults.find((item) => item.exitCode !== 0);
  const notProven = report.assessments.filter((item) => item.status === "not_proven");
  if (failedCommand || notProven.length > 0) {
    process.exit(1);
  }
};

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  main();
}
