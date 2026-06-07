import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../../../../database/main/databaseService.js";
import {
  chapterSummary,
  memoryNarrativeSummary,
  memoryNarrativeSummarySource,
} from "../../../../../database/schema/index.js";
import type { NarrativeMemoryFactResult } from "../../../../../../shared/types/search.js";
import { CONFIRMED_SUMMARY_STATUS, NARRATIVE_SUMMARY_COUNT_LIMIT, NARRATIVE_SUMMARY_TEXT_LIMIT } from "./constants.js";
import { resolveChapterOrderMap } from "./chapter.js";

function summarizeScopeTypePriority(scopeType: string): number {
  switch (scopeType) {
    case "project":
      return 10;
    case "volume":
      return 9;
    case "arc":
      return 8;
    case "community":
      return 7;
    case "chapter":
      return 6;
    case "scene":
      return 5;
    default:
      return 0;
  }
}

export function buildNarrativeSummaryPredicate(
  summaryType: string,
  scopeType: string,
): string {
  const normalizedType = summaryType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .slice(0, 80);
  return `summary_of_${normalizedType.length > 0 ? normalizedType : scopeType}`;
}

function buildNarrativeSummaryObjectValue(summary: {
  summaryType: string;
  scopeType: string;
  scopeId: string | null;
  title: string;
  summary: string;
}): string {
  const label = summary.scopeId
    ? `${summary.scopeType}:${summary.scopeId}`
    : `${summary.scopeType}:${summary.title}`;
  const title = summary.title.trim().length > 0 ? `${summary.title} — ` : "";
  return trimSummaryTextForNarrativeSummary(
    `${title}${summary.summary}${summary.scopeType ? ` (${label})` : ""}`,
  );
}

function trimSummaryTextForNarrativeSummary(input: string): string {
  const normalized = (input ?? "").trim();
  if (normalized.length <= NARRATIVE_SUMMARY_TEXT_LIMIT) return normalized;
  return `${normalized.slice(0, NARRATIVE_SUMMARY_TEXT_LIMIT)}...`;
}

function trimSummaryText(input: string): string {
  const normalized = (input ?? "").trim();
  return normalized;
}

async function countNarrativeSummarySources(input: {
  projectId: string;
  summaryIds: string[];
}): Promise<Map<string, number>> {
  if (input.summaryIds.length === 0) return new Map();
  const rows = await db
    .getClient()
    .select({
      summaryId: memoryNarrativeSummarySource.summaryId,
      count: sql<number>`count(*)`,
    })
    .from(memoryNarrativeSummarySource)
    .where(
      and(
        eq(memoryNarrativeSummarySource.projectId, input.projectId),
        inArray(memoryNarrativeSummarySource.summaryId, input.summaryIds),
      ),
    )
    .groupBy(memoryNarrativeSummarySource.summaryId);
  return new Map(rows.map((row) => [row.summaryId, Number(row.count)]));
}

async function fetchNarrativeSummaryRows(input: {
  projectId: string;
  chapterOrder: number | null;
  includePriorMemory: boolean;
  statusFilter?: string[];
}): Promise<
  Array<{
    id: string;
    title: string;
    summaryType: string;
    scopeType: string;
    scopeId: string | null;
    summary: string;
    status: string;
    confidence: number;
    updatedAt: string;
  }>
> {
  const whereClause = input.statusFilter
    ? and(
        eq(memoryNarrativeSummary.projectId, input.projectId),
        inArray(memoryNarrativeSummary.status, input.statusFilter),
      )
    : eq(memoryNarrativeSummary.projectId, input.projectId);

  const rows = await db
    .getClient()
    .select({
      id: memoryNarrativeSummary.id,
      title: memoryNarrativeSummary.title,
      summaryType: memoryNarrativeSummary.summaryType,
      scopeType: memoryNarrativeSummary.scopeType,
      scopeId: memoryNarrativeSummary.scopeId,
      summary: memoryNarrativeSummary.summary,
      status: memoryNarrativeSummary.status,
      confidence: memoryNarrativeSummary.confidence,
      updatedAt: memoryNarrativeSummary.updatedAt,
    })
    .from(memoryNarrativeSummary)
    .where(whereClause)
    .orderBy(desc(memoryNarrativeSummary.updatedAt))
    .limit(80);

  if (input.chapterOrder === null || rows.length === 0) {
    return rows;
  }

  const chapterIds = rows
    .filter((row) => row.scopeType === "chapter" && row.scopeId !== null)
    .map((row) => row.scopeId) as string[];
  if (chapterIds.length === 0) {
    return rows;
  }

  const chapterOrderById = await resolveChapterOrderMap({
    projectId: input.projectId,
    chapterIds: [...new Set(chapterIds)],
  });

  return rows.filter((row) => {
    if (input.chapterOrder === null) {
      return true;
    }
    if (row.scopeType !== "chapter" || row.scopeId === null) {
      return true;
    }
    const chapterOrder = chapterOrderById.get(row.scopeId);
    if (chapterOrder === undefined) return false;
    return input.includePriorMemory
      ? chapterOrder <= input.chapterOrder
      : chapterOrder === input.chapterOrder;
  });
}

function mapSummaryRowsToFacts(
  rows: Array<{
    id: string;
    title: string;
    summaryType: string;
    scopeType: string;
    scopeId: string | null;
    summary: string;
    status: string;
    confidence: number;
    updatedAt: string;
  }>,
  chapterOrderById: Map<string, number>,
): NarrativeMemoryFactResult[] {
  const prioritizedRows = [...rows]
    .sort((a, b) => {
      const aPriority = summarizeScopeTypePriority(a.scopeType);
      const bPriority = summarizeScopeTypePriority(b.scopeType);
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      const aOrder = a.scopeType === "chapter" ? (chapterOrderById.get(a.scopeId ?? "") ?? 0) : 0;
      const bOrder = b.scopeType === "chapter" ? (chapterOrderById.get(b.scopeId ?? "") ?? 0) : 0;
      if (aOrder !== bOrder) {
        return bOrder - aOrder;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, NARRATIVE_SUMMARY_COUNT_LIMIT);

  return prioritizedRows.map((row) => {
    const chapterOrder =
      row.scopeType === "chapter" && row.scopeId !== null
        ? chapterOrderById.get(row.scopeId) ?? null
        : null;
    const observedAt =
      row.scopeType === "chapter" && chapterOrder !== null
        ? chapterOrder
        : summarizeScopeTypePriority(row.scopeType) * 10_000;

    return {
      id: row.id,
      subjectEntityId: row.scopeId ?? row.id,
      predicate: buildNarrativeSummaryPredicate(row.summaryType, row.scopeType),
      objectEntityId: null,
      objectValue: trimSummaryTextForNarrativeSummary(
        buildNarrativeSummaryObjectValue(row),
      ),
      valueType: "summary",
      validFromChapterOrder: chapterOrder ?? 0,
      validToChapterOrder: null,
      observedAtChapterOrder: observedAt,
      confidence: row.confidence > 0 ? Math.min(100, row.confidence) : 20,
      status: row.status,
      evidenceCount: 0,
      relatedEntityId: row.scopeId,
      relatedEntityName: row.title,
      relatedEntityType: row.scopeType,
    };
  });
}

export async function fetchNarrativeSummaryFacts(input: {
  projectId: string;
  chapterOrder: number | null;
  includePriorMemory: boolean;
}): Promise<NarrativeMemoryFactResult[]> {
  const confirmedRows = await fetchNarrativeSummaryRows({
    projectId: input.projectId,
    chapterOrder: input.chapterOrder,
    includePriorMemory: input.includePriorMemory,
    statusFilter: [CONFIRMED_SUMMARY_STATUS],
  });
  const summaryRows =
    confirmedRows.length > 0
      ? confirmedRows
      : await fetchNarrativeSummaryRows({
          projectId: input.projectId,
          chapterOrder: input.chapterOrder,
          includePriorMemory: input.includePriorMemory,
        });

  if (summaryRows.length === 0) {
    return [];
  }

  const chapterIds = [
    ...new Set(
      summaryRows
        .filter((row) => row.scopeType === "chapter" && row.scopeId !== null)
        .map((row) => row.scopeId as string),
    ),
  ];
  const chapterOrderById = await resolveChapterOrderMap({
    projectId: input.projectId,
    chapterIds,
  });
  const evidenceCountBySummaryId = await countNarrativeSummarySources({
    projectId: input.projectId,
    summaryIds: summaryRows.map((row) => row.id),
  });

  const facts = mapSummaryRowsToFacts(summaryRows, chapterOrderById).slice(
    0,
    NARRATIVE_SUMMARY_COUNT_LIMIT,
  );

  return facts.map((row) => ({
    ...row,
    evidenceCount:
      evidenceCountBySummaryId.get(row.id) ?? (row.evidenceCount ?? 0),
  }));
}

export async function fetchChapterSummaryFacts(input: {
  projectId: string;
  chapterOrder: number | null;
  includePriorMemory: boolean;
}): Promise<NarrativeMemoryFactResult[]> {
  const boundaryPredicate =
    input.chapterOrder === null
      ? undefined
      : input.includePriorMemory
        ? lte(chapterSummary.chapterNumber, input.chapterOrder)
        : eq(chapterSummary.chapterNumber, input.chapterOrder);

  const rows = await db
    .getClient()
    .select({
      id: chapterSummary.id,
      chapterId: chapterSummary.chapterId,
      summary: chapterSummary.summary,
      chapterNumber: chapterSummary.chapterNumber,
      isFallback: chapterSummary.isFallback,
    })
    .from(chapterSummary)
    .where(
      and(eq(chapterSummary.projectId, input.projectId), boundaryPredicate),
    )
    .orderBy(
      desc(chapterSummary.chapterNumber),
      desc(chapterSummary.generatedAt),
    )
    .limit(input.includePriorMemory ? 8 : 4);

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    return {
      id: row.id,
      subjectEntityId: row.chapterId,
      predicate: "summary_of_chapter",
      objectEntityId: null,
      objectValue: trimSummaryText(row.summary),
      valueType: "summary",
      validFromChapterOrder: row.chapterNumber,
      validToChapterOrder: null,
      observedAtChapterOrder: row.chapterNumber,
      confidence: row.isFallback ? 20 : 60,
      status: row.isFallback ? "suggested" : "confirmed",
      evidenceCount: 0,
      relatedEntityId: row.chapterId,
      relatedEntityName: null,
      relatedEntityType: "chapter",
    };
  });
}
