#!/usr/bin/env tsx
/* eslint-disable no-console */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/main/infra/database/index.js";
import {
  MEMORY_LONGFORM_BENCHMARK_PROFILES,
  buildMemoryLongformBenchmarkSeed,
  type MemoryLongformBenchmarkProfileName,
} from "../src/main/services/features/memory/benchmark/memoryLongformBenchmarkSeed.js";
import { materializeMemoryLongformBenchmark } from "../src/main/services/features/memory/benchmark/memoryLongformBenchmarkMaterialize.js";
import {
  runMemoryBenchmarkLatencyReport,
  summarizeMemoryBenchmarkLatencyFailures,
} from "../src/main/services/features/memory/benchmark/memoryBenchmarkLatencyRunner.js";
import type { SearchOptimizationMode } from "../src/main/services/features/search/searchOptimizationPolicy.js";

type CliOptions = {
  projectId?: string;
  profile: MemoryLongformBenchmarkProfileName;
  seed: number;
  query?: string;
  optimizationMode?: SearchOptimizationMode;
  out?: string;
  materialize: boolean;
  assertThresholds: boolean;
};

function isProfileName(value: string): value is MemoryLongformBenchmarkProfileName {
  return value in MEMORY_LONGFORM_BENCHMARK_PROFILES;
}

function isSearchOptimizationMode(value: string): value is SearchOptimizationMode {
  return (
    value === "low-end" ||
    value === "standard" ||
    value === "high-end" ||
    value === "quality"
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    profile: "ci-1000",
    seed: 20260611,
    materialize: false,
    assertThresholds: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--") {
      continue;
    }
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--profile" && next) {
      if (!isProfileName(next)) {
        throw new Error(`Unknown benchmark profile: ${next}`);
      }
      options.profile = next;
      index += 1;
      continue;
    }
    if (arg === "--seed" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid seed: ${next}`);
      }
      options.seed = parsed;
      index += 1;
      continue;
    }
    if (arg === "--query" && next) {
      options.query = next;
      index += 1;
      continue;
    }
    if (arg === "--optimization-mode" && next) {
      if (!isSearchOptimizationMode(next)) {
        throw new Error(`Unknown search optimization mode: ${next}`);
      }
      options.optimizationMode = next;
      index += 1;
      continue;
    }
    if (arg === "--out" && next) {
      options.out = next;
      index += 1;
      continue;
    }
    if (arg === "--materialize") {
      options.materialize = true;
      continue;
    }
    if (arg === "--assert-thresholds") {
      options.assertThresholds = true;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const projectId =
    options.projectId ?? `benchmark-${options.profile}-${options.seed}`;

  await db.initialize();
  try {
    if (options.materialize) {
      const manifest = buildMemoryLongformBenchmarkSeed({
        profileName: options.profile,
        seed: options.seed,
      });
      await materializeMemoryLongformBenchmark({
        manifest,
        projectId,
      });
    }

    const report = await runMemoryBenchmarkLatencyReport({
      projectId,
      profileName: options.profile,
      query: options.query,
      optimizationMode: options.optimizationMode,
    });
    const json = `${JSON.stringify(report, null, 2)}\n`;

    if (options.out) {
      const outPath = path.resolve(options.out);
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, json, "utf8");
      console.log(`Wrote memory benchmark latency report to ${outPath}`);
    } else {
      console.log(json);
    }

    if (options.assertThresholds) {
      const failures = summarizeMemoryBenchmarkLatencyFailures(report);
      if (failures.length > 0) {
        throw new Error(
          `Memory benchmark latency thresholds failed:\n${failures.join("\n")}`,
        );
      }
      console.log("Memory benchmark latency thresholds passed");
    }
  } finally {
    await db.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  void db.disconnect().finally(() => process.exit(1));
});
