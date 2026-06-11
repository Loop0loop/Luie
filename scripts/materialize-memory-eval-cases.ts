#!/usr/bin/env tsx

import { db } from "../src/main/database/main/databaseService.js";
import { auditMemoryEvalCaseQuality } from "../src/main/services/features/memory/eval/memoryEvalQualityAudit.js";
import {
  countMemoryEvalCases,
  materializeMemoryEvalCasesFromEpisodeEvidence,
  materializeTemporalChapterEvalCasesFromChunks,
  materializeWriterPainPointEvalCasesFromChunks,
  repairLegacyEpisodeEvalCases,
  repairWriterPainPointTaxonomyEvalCases,
} from "../src/main/services/features/memory/eval/memoryEvalCaseMaterialization.js";

type CliOptions = {
  projectId: string;
  limit: number;
  qualityAudit: boolean;
  repairLegacy: boolean;
  repairQuality: boolean;
  repairTaxonomy: boolean;
  temporalChapter: boolean;
  writerPainPoints: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    limit: 20,
    qualityAudit: false,
    repairLegacy: false,
    repairQuality: false,
    repairTaxonomy: false,
    temporalChapter: false,
    writerPainPoints: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--writer-pain-points") {
      options.writerPainPoints = true;
      continue;
    }
    if (arg === "--temporal-chapter") {
      options.temporalChapter = true;
      continue;
    }
    if (arg === "--quality-audit") {
      options.qualityAudit = true;
      continue;
    }
    if (arg === "--repair-quality") {
      options.qualityAudit = true;
      options.repairQuality = true;
      continue;
    }
    if (arg === "--repair-legacy") {
      options.repairLegacy = true;
      continue;
    }
    if (arg === "--repair-taxonomy") {
      options.repairTaxonomy = true;
      continue;
    }
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000) {
        throw new Error("--limit must be an integer from 1 to 1000");
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
    let result:
      | Awaited<ReturnType<typeof repairLegacyEpisodeEvalCases>>
      | Awaited<ReturnType<typeof repairWriterPainPointTaxonomyEvalCases>>
      | Awaited<ReturnType<typeof auditMemoryEvalCaseQuality>>
      | Awaited<ReturnType<typeof materializeTemporalChapterEvalCasesFromChunks>>
      | Awaited<ReturnType<typeof materializeWriterPainPointEvalCasesFromChunks>>
      | Awaited<ReturnType<typeof materializeMemoryEvalCasesFromEpisodeEvidence>>;
    if (options.repairLegacy) {
      result = await repairLegacyEpisodeEvalCases({
        projectId: options.projectId,
      });
    } else if (options.repairTaxonomy) {
      result = await repairWriterPainPointTaxonomyEvalCases({
        projectId: options.projectId,
      });
    } else if (options.qualityAudit) {
      result = await auditMemoryEvalCaseQuality({
        projectId: options.projectId,
        repairExpectedAnswers: options.repairQuality,
      });
    } else if (options.writerPainPoints) {
      result = await materializeWriterPainPointEvalCasesFromChunks({
        projectId: options.projectId,
        limit: options.limit,
      });
    } else if (options.temporalChapter) {
      result = await materializeTemporalChapterEvalCasesFromChunks({
        projectId: options.projectId,
        limit: options.limit,
      });
    } else {
      result = await materializeMemoryEvalCasesFromEpisodeEvidence({
        projectId: options.projectId,
        limit: options.limit,
      });
    }
    const after = await countMemoryEvalCases({ projectId: options.projectId });
    // eslint-disable-next-line no-console -- CLI script output.
    console.log(
      JSON.stringify({ projectId: options.projectId, before, result, after }, null, 2),
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
