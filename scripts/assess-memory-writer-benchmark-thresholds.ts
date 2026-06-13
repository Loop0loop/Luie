#!/usr/bin/env tsx
/* eslint-disable no-console */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import {
  db,
  memoryWriterTaskBenchmarkRun,
} from "../src/main/infra/database/index.js";
import {
  assessMemoryWriterTaskBenchmarkThresholds,
  buildMemoryWriterTaskBenchmarkFinalizationManifest,
  calibrateMemoryWriterTaskBenchmarkThresholds,
  finalizeMemoryWriterTaskBenchmarkThresholds,
  summarizeMemoryWriterTaskBenchmarkFinalizationReadinessFailures,
  type MemoryWriterTaskBenchmarkThresholds,
} from "../src/main/services/features/memory/benchmark/index.js";
import type { MemoryWriterTaskBenchmarkSummary } from "../src/shared/types/index.js";

type CliOptions = {
  projectId?: string;
  minimumBetaRuns: number;
  out?: string;
  assertThresholds: boolean;
  assertFinalizationReady: boolean;
  calibrateThresholds: boolean;
  finalizeThresholds: boolean;
  finalizationManifest: boolean;
  confirmRealBetaData: boolean;
  thresholds: Partial<MemoryWriterTaskBenchmarkThresholds>;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    minimumBetaRuns: 3,
    assertThresholds: false,
    assertFinalizationReady: false,
    calibrateThresholds: false,
    finalizeThresholds: false,
    finalizationManifest: false,
    confirmRealBetaData: false,
    thresholds: {},
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--minimum-beta-runs" && next) {
      options.minimumBetaRuns = parsePositiveInteger(next, "--minimum-beta-runs");
      index += 1;
      continue;
    }
    if (arg === "--out" && next) {
      options.out = next;
      index += 1;
      continue;
    }
    if (arg === "--assert-thresholds") {
      options.assertThresholds = true;
      continue;
    }
    if (arg === "--assert-finalization-ready") {
      options.assertFinalizationReady = true;
      continue;
    }
    if (arg === "--calibrate-thresholds") {
      options.calibrateThresholds = true;
      continue;
    }
    if (arg === "--finalize-thresholds") {
      options.finalizeThresholds = true;
      continue;
    }
    if (arg === "--finalization-manifest") {
      options.finalizationManifest = true;
      continue;
    }
    if (arg === "--confirm-real-beta-data") {
      options.confirmRealBetaData = true;
      continue;
    }
    if (arg === "--min-success-rate" && next) {
      options.thresholds.minSuccessRate = parseRatio(next, "--min-success-rate");
      index += 1;
      continue;
    }
    if (arg === "--min-evidence-satisfaction-rate" && next) {
      options.thresholds.minEvidenceSatisfactionRate = parseRatio(
        next,
        "--min-evidence-satisfaction-rate",
      );
      index += 1;
      continue;
    }
    if (arg === "--max-false-confidence-rate" && next) {
      options.thresholds.maxFalseConfidenceRate = parseRatio(
        next,
        "--max-false-confidence-rate",
      );
      index += 1;
      continue;
    }
    if (arg === "--max-average-response-time-ms" && next) {
      const parsed = Number.parseFloat(next);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("--max-average-response-time-ms must be non-negative");
      }
      options.thresholds.maxAverageResponseTimeMs = parsed;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

async function loadSummaries(
  projectId?: string,
): Promise<MemoryWriterTaskBenchmarkSummary[]> {
  const rows = projectId
    ? await db
        .getClient()
        .select()
        .from(memoryWriterTaskBenchmarkRun)
        .where(eq(memoryWriterTaskBenchmarkRun.projectId, projectId))
    : await db.getClient().select().from(memoryWriterTaskBenchmarkRun);
  return rows.map((row) => JSON.parse(row.summaryJson) as MemoryWriterTaskBenchmarkSummary);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await db.initialize();
  try {
    const summaries = await loadSummaries(options.projectId);
    const assessment = assessMemoryWriterTaskBenchmarkThresholds({
      summaries,
      minimumBetaRunCount: options.minimumBetaRuns,
      thresholds:
        Object.keys(options.thresholds).length > 0
          ? (options.thresholds as MemoryWriterTaskBenchmarkThresholds)
          : undefined,
    });
    const finalizationManifest =
      options.finalizationManifest || options.assertFinalizationReady
        ? buildMemoryWriterTaskBenchmarkFinalizationManifest({
            projectId: options.projectId ?? null,
            generatedAt: new Date().toISOString(),
            summaries,
            minimumBetaRunCount: options.minimumBetaRuns,
            confirmRealBetaData: options.confirmRealBetaData,
          })
        : null;
    const report = {
      projectId: options.projectId ?? null,
      assessment,
      calibration: options.calibrateThresholds
        ? calibrateMemoryWriterTaskBenchmarkThresholds({
            summaries,
            minimumBetaRunCount: options.minimumBetaRuns,
          })
        : null,
      finalization: options.finalizeThresholds
        ? finalizeMemoryWriterTaskBenchmarkThresholds({
            summaries,
            minimumBetaRunCount: options.minimumBetaRuns,
            confirmRealBetaData: options.confirmRealBetaData,
          })
        : null,
      finalizationManifest,
    };
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (options.out) {
      const outPath = path.resolve(options.out);
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, json, "utf8");
      console.log(`Wrote memory writer benchmark threshold report to ${outPath}`);
    } else {
      console.log(json);
    }
    if (options.assertThresholds && assessment.status !== "passed") {
      throw new Error(
        `Memory writer benchmark thresholds not passed: ${assessment.status}`,
      );
    }
    if (options.assertFinalizationReady && finalizationManifest) {
      const failures =
        summarizeMemoryWriterTaskBenchmarkFinalizationReadinessFailures(
          finalizationManifest,
        );
      if (failures.length > 0) {
        throw new Error(failures.join("\n"));
      }
    }
  } finally {
    await db.disconnect();
  }
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseRatio(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`${label} must be a number from 0 to 1`);
  }
  return parsed;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  void db.disconnect().finally(() => process.exit(1));
});
