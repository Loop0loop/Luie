import { count, desc, eq } from "drizzle-orm";
import {
  db,
  memoryNarrativeSummary,
  memoryNarrativeSummarySource,
} from "../../../../infra/database/index.js";
import { evaluateProjectNarrativeSummaryDrift } from "./memoryNarrativeSummaryDrift.js";

export type NarrativeSummaryStatusItem = {
  id: string;
  title: string;
  summary: string;
  summaryType: string;
  scopeType: string;
  scopeId: string | null;
  status: string;
  confidence: number;
  sourceContentHash: string;
  generatedAt: string;
  updatedAt: string;
  sourceCount: number;
  isStale: boolean;
};

export type NarrativeSummaryStatusResult = {
  projectId: string;
  totalCount: number;
  staleCount: number;
  byType: Record<string, number>;
  summaries: NarrativeSummaryStatusItem[];
};

export async function getNarrativeSummaryStatus(input: {
  projectId: string;
}): Promise<NarrativeSummaryStatusResult> {
  const client = db.getClient();
  const [summaryRows, sourceCountRows, driftRows] = await Promise.all([
    client
      .select({
        id: memoryNarrativeSummary.id,
        title: memoryNarrativeSummary.title,
        summary: memoryNarrativeSummary.summary,
        summaryType: memoryNarrativeSummary.summaryType,
        scopeType: memoryNarrativeSummary.scopeType,
        scopeId: memoryNarrativeSummary.scopeId,
        status: memoryNarrativeSummary.status,
        confidence: memoryNarrativeSummary.confidence,
        sourceContentHash: memoryNarrativeSummary.sourceContentHash,
        generatedAt: memoryNarrativeSummary.generatedAt,
        updatedAt: memoryNarrativeSummary.updatedAt,
      })
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.projectId, input.projectId))
      .orderBy(desc(memoryNarrativeSummary.updatedAt)),
    client
      .select({
        summaryId: memoryNarrativeSummarySource.summaryId,
        sourceCount: count(),
      })
      .from(memoryNarrativeSummarySource)
      .where(eq(memoryNarrativeSummarySource.projectId, input.projectId))
      .groupBy(memoryNarrativeSummarySource.summaryId),
    evaluateProjectNarrativeSummaryDrift({ projectId: input.projectId }),
  ]);

  const sourceCountBySummaryId = new Map(
    sourceCountRows.map((row) => [row.summaryId, Number(row.sourceCount)]),
  );
  const staleBySummaryId = new Map(
    driftRows.map((row) => [row.summaryId, row.isStale]),
  );
  const byType: Record<string, number> = {};
  const summaries = summaryRows.map((row) => {
    byType[row.summaryType] = (byType[row.summaryType] ?? 0) + 1;
    return {
      ...row,
      sourceCount: sourceCountBySummaryId.get(row.id) ?? 0,
      isStale: staleBySummaryId.get(row.id) ?? false,
    };
  });

  return {
    projectId: input.projectId,
    totalCount: summaries.length,
    staleCount: summaries.filter((summary) => summary.isStale).length,
    byType,
    summaries,
  };
}
