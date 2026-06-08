#!/usr/bin/env tsx

import { sql } from "drizzle-orm";
import { db } from "../src/main/database/main/databaseService.js";
import { dbMaintenanceService } from "../src/main/services/features/dbMaintenanceService.js";
import { memoryProjectionService } from "../src/main/services/features/memory/memoryProjectionService.js";

type CliOptions = {
  projectId: string;
  limit: number;
  maxPasses: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    limit: 50,
    maxPasses: 10,
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
    if (arg === "--max-passes" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        throw new Error("--max-passes must be an integer from 1 to 100");
      }
      options.maxPasses = parsed;
      index += 1;
      continue;
    }
  }

  if (!options.projectId.trim()) {
    throw new Error("--project-id is required");
  }

  return options;
}

async function readChunkHealth(projectId: string): Promise<{
  total: number;
  missingIndexText: number;
  missingContextLabel: number;
  missingSourceHash: number;
}> {
  const rows = await db.getClient().all<{
    total: number;
    missingIndexText: number;
    missingContextLabel: number;
    missingSourceHash: number;
  }>(sql`
    SELECT
      COUNT(*) AS "total",
      SUM(CASE WHEN "indexText" IS NULL OR "indexText" = '' THEN 1 ELSE 0 END) AS "missingIndexText",
      SUM(CASE WHEN "contextLabel" IS NULL OR "contextLabel" = '' THEN 1 ELSE 0 END) AS "missingContextLabel",
      SUM(CASE WHEN "sourceContentHash" IS NULL OR "sourceContentHash" = '' THEN 1 ELSE 0 END) AS "missingSourceHash"
    FROM "MemoryChunk"
    WHERE "projectId" = ${projectId};
  `);
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    missingIndexText: Number(row?.missingIndexText ?? 0),
    missingContextLabel: Number(row?.missingContextLabel ?? 0),
    missingSourceHash: Number(row?.missingSourceHash ?? 0),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await db.initialize();
  try {
    const before = await readChunkHealth(options.projectId);
    const queued = await dbMaintenanceService.rebuildMemoryChunks({
      projectId: options.projectId,
    });
    let processed = 0;
    const passes: Array<{ pass: number; queued: number; processed: number }> = [];

    for (let pass = 1; pass <= options.maxPasses; pass += 1) {
      const result = await memoryProjectionService.processPendingChunkJobs({
        projectId: options.projectId,
        limit: options.limit,
      });
      processed += result.processed;
      passes.push({ pass, queued: result.queued, processed: result.processed });
      if (result.queued === 0 || result.processed === 0) break;
    }

    const after = await readChunkHealth(options.projectId);
    console.log(JSON.stringify({ projectId: options.projectId, queued, processed, passes, before, after }, null, 2));
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
