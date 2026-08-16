#!/usr/bin/env tsx

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/main/database/main/databaseService.js";
import { getMemoryReviewBacklogReport } from "../src/main/services/features/memory/review/memoryReviewBacklogReport.js";

type CliOptions = {
  projectId: string;
  limit: number;
  evidenceLimit: number;
  outPath: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    limit: 50,
    evidenceLimit: 3,
    outPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
        throw new Error("--limit must be an integer from 1 to 200");
      }
      options.limit = parsed;
      index += 1;
      continue;
    }
    if (arg === "--evidence-limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
        throw new Error("--evidence-limit must be an integer from 1 to 10");
      }
      options.evidenceLimit = parsed;
      index += 1;
      continue;
    }
    if (arg === "--out" && next) {
      options.outPath = next;
      index += 1;
    }
  }

  if (!options.projectId.trim()) {
    throw new Error("--project-id is required");
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await db.initialize();
  try {
    const report = await getMemoryReviewBacklogReport({
      projectId: options.projectId,
      limit: options.limit,
      evidenceLimit: options.evidenceLimit,
    });
    const payload = JSON.stringify(report, null, 2);
    if (options.outPath) {
      await writeFile(path.resolve(options.outPath), `${payload}\n`, "utf8");
      console.log(JSON.stringify({ written: path.resolve(options.outPath) }, null, 2));
      return;
    }
    console.log(payload);
  } finally {
    await db.disconnect();
  }
}

await main().catch((error) => {
  console.error(
    JSON.stringify(
      { error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exit(1);
});
