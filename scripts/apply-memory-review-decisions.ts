#!/usr/bin/env tsx

import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/main/database/main/databaseService.js";
import { projectService } from "../src/main/services/core/projectService.js";
import {
  applyMemoryReviewDecisions,
  validateMemoryReviewDecisionsAgainstDb,
  type MemoryReviewDecisionInput,
} from "../src/main/services/features/memory/review/memoryReviewDecisionApply.js";

type CliOptions = {
  filePath: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    filePath: "",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--file" && next) {
      options.filePath = next;
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  if (!options.filePath.trim()) {
    throw new Error("--file is required");
  }
  return options;
}

const parseDecisionFile = async (filePath: string): Promise<MemoryReviewDecisionInput> => {
  const raw = await readFile(path.resolve(filePath), "utf8");
  const parsed = JSON.parse(raw) as MemoryReviewDecisionInput;
  if (!parsed || typeof parsed.projectId !== "string" || parsed.projectId.trim().length === 0) {
    throw new Error("Decision file must include projectId");
  }
  if (!Array.isArray(parsed.entities) && !Array.isArray(parsed.facts)) {
    throw new Error("Decision file must include entities or facts array");
  }
  return parsed;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const decisions = await parseDecisionFile(options.filePath);

  await db.initialize();
  try {
    if (options.dryRun) {
      const result = await validateMemoryReviewDecisionsAgainstDb(decisions);
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            ...result,
          },
          null,
          2,
        ),
      );
      return;
    }

    const result = await applyMemoryReviewDecisions(decisions, {
      persistPackageAfterMutation: (projectId, reason) =>
        projectService.persistPackageAfterMutation(projectId, reason),
    });
    console.log(JSON.stringify(result, null, 2));
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
