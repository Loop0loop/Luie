#!/usr/bin/env tsx

import { db } from "../src/main/database/main/databaseService.js";
import { repairMemoryEvidenceChunkLinks } from "../src/main/services/features/memory/repair/memoryEvidenceChunkLinkRepair.js";

type CliOptions = {
  projectId: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { projectId: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
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
    const result = await repairMemoryEvidenceChunkLinks({
      projectId: options.projectId,
    });
    console.log(JSON.stringify({ projectId: options.projectId, ...result }, null, 2));
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
