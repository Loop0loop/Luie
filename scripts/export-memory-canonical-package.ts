#!/usr/bin/env tsx

import { db } from "../src/main/database/main/databaseService.js";
import { createLogger } from "../src/shared/logger/index.js";
import { getProjectAttachmentPath } from "../src/main/services/core/project/projectAttachmentStore.js";
import { exportProjectPackageWithOptions } from "../src/main/services/core/project/projectExportEngine.js";
import { readLuieContainerEntry } from "../src/main/services/io/luieContainer.js";
import {
  LUIE_MEMORY_CANONICAL_FILE,
  LUIE_MEMORY_DIR,
} from "../src/shared/constants/index.js";

type CliOptions = {
  projectId: string;
};

const logger = createLogger("MemoryCanonicalPackageExportRunner");

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

const countPayloadRows = (raw: string | null): number => {
  if (!raw) return 0;
  const parsed = JSON.parse(raw) as {
    tables?: Record<string, Array<unknown>>;
  };
  return Object.values(parsed.tables ?? {}).reduce(
    (total, rows) => total + rows.length,
    0,
  );
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await db.initialize();
  try {
    const projectPath = await getProjectAttachmentPath(options.projectId);
    const exported = await exportProjectPackageWithOptions({
      projectId: options.projectId,
      logger,
    });
    const entryPath = `${LUIE_MEMORY_DIR}/${LUIE_MEMORY_CANONICAL_FILE}`;
    const memoryRaw =
      projectPath && exported
        ? await readLuieContainerEntry(projectPath, entryPath)
        : null;

    // eslint-disable-next-line no-console -- CLI script output.
    console.log(
      JSON.stringify(
        {
          projectId: options.projectId,
          projectPath,
          exported,
          memoryEntryPath: entryPath,
          memoryPayloadRows: countPayloadRows(memoryRaw),
          memoryEntryBytes: memoryRaw?.length ?? 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.disconnect();
  }
}

await main().catch((error) => {
  // eslint-disable-next-line no-console -- CLI script error output.
  console.error(
    JSON.stringify(
      { error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exit(1);
});
