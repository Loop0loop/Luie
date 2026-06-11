#!/usr/bin/env tsx
/* eslint-disable no-console */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/main/infra/database/index.js";
import { materializeMemoryLongformBenchmark } from "../src/main/services/features/memory/benchmark/memoryLongformBenchmarkMaterialize.js";
import {
  buildMemoryLongformBenchmarkSeed,
  MEMORY_LONGFORM_BENCHMARK_PROFILES,
  type MemoryLongformBenchmarkProfileName,
} from "../src/main/services/features/memory/benchmark/memoryLongformBenchmarkSeed.js";

type CliOptions = {
  profile: MemoryLongformBenchmarkProfileName;
  seed: number;
  out?: string;
  materialize: boolean;
  projectId?: string;
};

function isProfileName(value: string): value is MemoryLongformBenchmarkProfileName {
  return value in MEMORY_LONGFORM_BENCHMARK_PROFILES;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    profile: "ci-1000",
    seed: 20260611,
    materialize: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--") {
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
    if (arg === "--out" && next) {
      options.out = next;
      index += 1;
      continue;
    }
    if (arg === "--materialize") {
      options.materialize = true;
      continue;
    }
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const manifest = buildMemoryLongformBenchmarkSeed({
    profileName: options.profile,
    seed: options.seed,
  });
  const json = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.materialize) {
    const projectId =
      options.projectId ?? `benchmark-${options.profile}-${options.seed}`;
    await db.initialize();
    try {
      const result = await materializeMemoryLongformBenchmark({
        manifest,
        projectId,
      });
      console.log(JSON.stringify(result, null, 2));
    } finally {
      await db.disconnect();
    }
  }

  if (options.out) {
    const outPath = path.resolve(options.out);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, json, "utf8");
    console.log(`Wrote memory benchmark seed to ${outPath}`);
    return;
  }

  console.log(json);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  void db.disconnect().finally(() => process.exit(1));
});
