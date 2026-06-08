import crypto from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  chapterSummary,
  db,
  memoryNarrativeSummary,
  memoryNarrativeSummarySource,
} from "../../../../infra/database/index.js";
import {
  generateProjectNarrativeSummaryHierarchy,
  type NarrativeHierarchySummarizer,
} from "./memoryNarrativeSummaryRunner.js";

export type NarrativeSummaryDriftResult = {
  summaryId: string;
  summaryType: string;
  scopeType: string;
  scopeId: string | null;
  isStale: boolean;
  storedSourceContentHash: string;
  currentSourceContentHash: string;
  storedSourceCount: number;
  currentSourceCount: number;
};

function computeChapterSummarySourceHash(
  summaries: Array<{ id: string; contentHash: string }>,
): string {
  const payload = summaries
    .map((summary) => `${summary.id}:${summary.contentHash}`)
    .join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function evaluateProjectNarrativeSummaryDrift(input: {
  projectId: string;
}): Promise<NarrativeSummaryDriftResult[]> {
  const client = db.getClient();
  const summaryRows = await client
    .select({
      id: memoryNarrativeSummary.id,
      summaryType: memoryNarrativeSummary.summaryType,
      scopeType: memoryNarrativeSummary.scopeType,
      scopeId: memoryNarrativeSummary.scopeId,
      sourceContentHash: memoryNarrativeSummary.sourceContentHash,
    })
    .from(memoryNarrativeSummary)
    .where(
      and(
        eq(memoryNarrativeSummary.projectId, input.projectId),
        eq(memoryNarrativeSummary.summaryType, "project_overview"),
        eq(memoryNarrativeSummary.scopeType, "project"),
      ),
    );

  const results: NarrativeSummaryDriftResult[] = [];
  for (const summaryRow of summaryRows) {
    const sourceRows = await client
      .select({
        chapterSummaryId: memoryNarrativeSummarySource.chapterSummaryId,
      })
      .from(memoryNarrativeSummarySource)
      .where(
        and(
          eq(memoryNarrativeSummarySource.projectId, input.projectId),
          eq(memoryNarrativeSummarySource.summaryId, summaryRow.id),
          eq(memoryNarrativeSummarySource.sourceType, "chapter_summary"),
        ),
      );
    const chapterSummaryIds = sourceRows
      .map((sourceRow) => sourceRow.chapterSummaryId)
      .filter((id): id is string => Boolean(id));
    const currentSources =
      chapterSummaryIds.length > 0
        ? await client
            .select({
              id: chapterSummary.id,
              contentHash: chapterSummary.contentHash,
            })
            .from(chapterSummary)
            .where(
              and(
                eq(chapterSummary.projectId, input.projectId),
                inArray(chapterSummary.id, chapterSummaryIds),
              ),
            )
            .orderBy(asc(chapterSummary.chapterNumber))
        : [];
    const currentSourceContentHash =
      computeChapterSummarySourceHash(currentSources);

    results.push({
      summaryId: summaryRow.id,
      summaryType: summaryRow.summaryType,
      scopeType: summaryRow.scopeType,
      scopeId: summaryRow.scopeId,
      isStale:
        summaryRow.sourceContentHash !== currentSourceContentHash ||
        sourceRows.length !== currentSources.length,
      storedSourceContentHash: summaryRow.sourceContentHash,
      currentSourceContentHash,
      storedSourceCount: sourceRows.length,
      currentSourceCount: currentSources.length,
    });
  }

  return results;
}

export async function refreshStaleProjectNarrativeSummaries(input: {
  projectId: string;
  nowIso?: string;
  summarizer?: NarrativeHierarchySummarizer;
}): Promise<{ inspected: number; refreshed: number; summaryIds: string[] }> {
  const driftResults = await evaluateProjectNarrativeSummaryDrift({
    projectId: input.projectId,
  });
  const staleSummaries = driftResults.filter((result) => result.isStale);
  if (staleSummaries.length === 0) {
    return { inspected: driftResults.length, refreshed: 0, summaryIds: [] };
  }

  const refreshedSummaryIds: string[] = [];
  for (const staleSummary of staleSummaries) {
    const result = await generateProjectNarrativeSummaryHierarchy({
      projectId: input.projectId,
      nowIso: input.nowIso,
      summarizer: input.summarizer,
    });
    if (result.generated > 0 && result.summaryId) {
      refreshedSummaryIds.push(result.summaryId);
    } else if (result.summaryId === staleSummary.summaryId) {
      refreshedSummaryIds.push(staleSummary.summaryId);
    }
  }

  return {
    inspected: driftResults.length,
    refreshed: refreshedSummaryIds.length,
    summaryIds: refreshedSummaryIds,
  };
}
