#!/usr/bin/env tsx

import { db } from "../src/main/database/main/databaseService.js";
import { getMemoryCanonicalExportAudit } from "../src/main/services/features/memory/persistence/memoryCanonicalExportAudit.js";

function parseProjectId(argv: string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--project-id" && argv[index + 1]) {
      return argv[index + 1];
    }
  }
  throw new Error("--project-id is required");
}

async function main(): Promise<void> {
  const projectId = parseProjectId(process.argv.slice(2));
  await db.initialize();
  try {
    const audit = await getMemoryCanonicalExportAudit({ projectId });
    console.log(JSON.stringify(audit, null, 2));
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
