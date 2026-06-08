#!/usr/bin/env tsx

import { db } from "../src/main/database/main/databaseService.js";
import {
  countMemoryEvalCases,
  materializeMemoryEvalCasesFromEpisodeEvidence,
} from "../src/main/services/features/memory/eval/memoryEvalCaseMaterialization.js";

type CliOptions = {
  projectId: string;
  limit: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { projectId: "", limit: 20 };
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
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        throw new Error("--limit must be an integer from 1 to 100");
      }
      options.limit = parsed;
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
    const before = await countMemoryEvalCases({ projectId: options.projectId });
    const result = await materializeMemoryEvalCasesFromEpisodeEvidence({
      projectId: options.projectId,
      limit: options.limit,
    });
    const after = await countMemoryEvalCases({ projectId: options.projectId });
    console.log(JSON.stringify({ projectId: options.projectId, before, result, after }, null, 2));
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
