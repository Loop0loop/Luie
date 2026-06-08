#!/usr/bin/env tsx

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/main/database/main/databaseService.js";
import { getMemoryReviewBacklogReport } from "../src/main/services/features/memory/review/memoryReviewBacklogReport.js";

type CliOptions = {
  projectId: string;
  limit: number;
  outPath: string | null;
};

type ReviewTemplateDecision = {
  id: string;
  name?: string;
  predicate?: string;
  quote?: string;
  action: "TODO";
  reason?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    limit: 50,
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
      evidenceLimit: 1,
    });
    const entities: ReviewTemplateDecision[] = report.entityCandidates.map((item) => ({
      id: item.id,
      name: item.canonicalName,
      quote: item.mentions[0]?.quote,
      action: "TODO",
    }));
    const facts: ReviewTemplateDecision[] = report.factCandidates.map((item) => ({
      id: item.id,
      name: item.subjectName ?? item.subjectEntityId,
      predicate: item.predicate,
      quote: item.evidence[0]?.quote,
      action: "TODO",
      reason: "",
    }));

    const payload = JSON.stringify(
      {
        projectId: report.projectId,
        generatedAt: report.generatedAt,
        note: "Edit each action to confirm or reject before running memory:apply-review-decisions. TODO is intentionally invalid.",
        entities,
        facts,
      },
      null,
      2,
    );
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
