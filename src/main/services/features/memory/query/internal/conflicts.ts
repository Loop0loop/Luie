import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../../../database/main/databaseService.js";
import {
  memoryFact,
  memoryFactInvalidation,
} from "../../../../../database/schema/index.js";
import type {
  MemoryConflictFactSummary,
  MemoryConflictQueueItem,
  NarrativeMemoryFactResult,
} from "../../../../../../shared/types/search.js";
import { ACTIVE_FACT_STATUSES } from "./constants.js";
import { countFactEvidence, fetchFactEvidenceQuotes } from "./evidence.js";
import { loadEntityInfo, resolveMemoryEntityIds } from "./entity.js";

async function fetchFactSummariesFromIds(input: {
  projectId: string;
  factIds: string[];
}): Promise<
  Array<{
    id: string;
    subjectEntityId: string;
    predicate: string;
    objectEntityId: string | null;
    objectValue: string | null;
    valueType: string;
    validFromChapterOrder: number;
    validToChapterOrder: number | null;
    observedAtChapterOrder: number;
    confidence: number;
    status: string;
    provenanceKind: string;
    canonStatus: string;
  }>
> {
  if (input.factIds.length === 0) return [];
  const rows = await db
    .getClient()
    .select({
      id: memoryFact.id,
      subjectEntityId: memoryFact.subjectEntityId,
      predicate: memoryFact.predicate,
      objectEntityId: memoryFact.objectEntityId,
      objectValue: memoryFact.objectValue,
      valueType: memoryFact.valueType,
      validFromChapterOrder: memoryFact.validFromChapterOrder,
      validToChapterOrder: memoryFact.validToChapterOrder,
      observedAtChapterOrder: memoryFact.observedAtChapterOrder,
      confidence: memoryFact.confidence,
      status: memoryFact.status,
      provenanceKind: memoryFact.provenanceKind,
      canonStatus: memoryFact.canonStatus,
    })
    .from(memoryFact)
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        inArray(memoryFact.id, input.factIds),
      ),
    );

  const normalized = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    normalized.set(row.id, row);
  }
  return [...normalized.values()]
    .filter((row) => ACTIVE_FACT_STATUSES.has(row.status))
    .map((row) => ({
      id: row.id,
      subjectEntityId: row.subjectEntityId,
      predicate: row.predicate,
      objectEntityId: row.objectEntityId,
      objectValue: row.objectValue,
      valueType: row.valueType,
      validFromChapterOrder: row.validFromChapterOrder,
      validToChapterOrder: row.validToChapterOrder,
      observedAtChapterOrder: row.observedAtChapterOrder,
      confidence: row.confidence,
      status: row.status,
      provenanceKind: row.provenanceKind,
      canonStatus: row.canonStatus,
    }));
}

async function fetchConflictQueueRows(input: {
  projectId: string;
  chapterOrder: number | null;
  includePriorMemory: boolean;
  entityId?: string;
  entityName?: string;
  entityNames?: string[];
  entityType?: string;
  limit?: number;
}): Promise<
  Array<{
    conflictId: string;
    reason: string;
    invalidatedFactId: string;
    invalidatingFactId: string;
  }>
> {
  const rows = await db
    .getClient()
    .select({
      conflictId: memoryFactInvalidation.id,
      reason: memoryFactInvalidation.reason,
      invalidatedFactId: memoryFactInvalidation.invalidatedFactId,
      invalidatingFactId: memoryFactInvalidation.invalidatingFactId,
    })
    .from(memoryFactInvalidation)
    .orderBy(desc(memoryFactInvalidation.createdAt))
    .where(eq(memoryFactInvalidation.projectId, input.projectId));

  const factIds = [
    ...new Set(
      rows.flatMap((row) => [row.invalidatedFactId, row.invalidatingFactId]),
    ),
  ];
  const facts = await fetchFactSummariesFromIds({
    projectId: input.projectId,
    factIds,
  });
  const factById = new Map(facts.map((fact) => [fact.id, fact] as const));
  const filterEntityIds = await resolveMemoryEntityIds(input);
  const resolvedFilterEntityIds =
    filterEntityIds === null ? [] : filterEntityIds;

  const filtered = rows.filter((row) => {
    const invalidated = factById.get(row.invalidatedFactId);
    const invalidating = factById.get(row.invalidatingFactId);
    if (!invalidated || !invalidating) return false;

    if (input.chapterOrder !== null) {
      const observed = invalidating.observedAtChapterOrder;
      if (input.includePriorMemory) {
        if (observed > input.chapterOrder) {
          return false;
        }
      } else if (observed !== input.chapterOrder) {
        return false;
      }
    }

    if (resolvedFilterEntityIds.length > 0) {
      const matched = new Set([
        invalidated.subjectEntityId,
        invalidated.objectEntityId,
        invalidating.subjectEntityId,
        invalidating.objectEntityId,
      ]);
      const isMatched = resolvedFilterEntityIds.some((id) => matched.has(id));
      if (!isMatched) return false;
    }

    return true;
  });

  const limit = input.limit ?? 50;
  return filtered.slice(0, limit).map((row) => ({
    conflictId: row.conflictId,
    reason: row.reason,
    invalidatedFactId: row.invalidatedFactId,
    invalidatingFactId: row.invalidatingFactId,
  }));
}

function buildConflictFactSummary(input: {
  row: {
    id: string;
    subjectEntityId: string;
    objectEntityId: string | null;
    objectValue: string | null;
    predicate: string;
    valueType: string;
    validFromChapterOrder: number;
    validToChapterOrder: number | null;
    observedAtChapterOrder: number;
    confidence: number;
    status: string;
    provenanceKind: string;
    canonStatus: string;
  };
  evidenceCount: number;
  evidenceQuotes: string[];
  entityInfo: Map<string, { name: string; type: string }>;
}): MemoryConflictFactSummary {
  return {
    id: input.row.id,
    subjectEntityId: input.row.subjectEntityId,
    subjectEntityName:
      input.entityInfo.get(input.row.subjectEntityId)?.name ?? null,
    predicate: input.row.predicate,
    objectEntityId: input.row.objectEntityId,
    objectEntityName: input.row.objectEntityId
      ? (input.entityInfo.get(input.row.objectEntityId)?.name ?? null)
      : null,
    objectValue: input.row.objectValue,
    valueType: input.row.valueType,
    validFromChapterOrder: input.row.validFromChapterOrder,
    validToChapterOrder: input.row.validToChapterOrder,
    observedAtChapterOrder: input.row.observedAtChapterOrder,
    confidence: input.row.confidence,
    status: input.row.status,
    provenanceKind: input.row.provenanceKind,
    canonStatus: input.row.canonStatus,
    evidenceCount: input.evidenceCount,
    evidenceQuotes: input.evidenceQuotes,
  };
}

export function toNarrativeMemoryFactSummary(
  summary: MemoryConflictFactSummary,
): NarrativeMemoryFactResult {
  return {
    ...summary,
    relatedEntityId: summary.objectEntityId,
    relatedEntityName: summary.objectEntityName ?? summary.objectValue,
    relatedEntityType: null,
  };
}

export async function fetchConflictFactPairs(input: {
  projectId: string;
  chapterOrder: number | null;
  includePriorMemory: boolean;
  entityId?: string;
  entityName?: string;
  entityNames?: string[];
  entityType?: string;
  limit?: number;
}): Promise<MemoryConflictQueueItem[]> {
  const rows = await fetchConflictQueueRows(input);
  if (rows.length === 0) return [];

  const factIds = [
    ...new Set(
      rows.flatMap((row) => [row.invalidatedFactId, row.invalidatingFactId]),
    ),
  ];
  const facts = await fetchFactSummariesFromIds({
    projectId: input.projectId,
    factIds,
  });
  const entityInfo = await loadEntityInfo({
    projectId: input.projectId,
    entityIds: facts.flatMap((fact) =>
      [fact.subjectEntityId, fact.objectEntityId].filter(
        (id): id is string => id !== null,
      ),
    ),
  });
  const evidenceCounts = await countFactEvidence({
    projectId: input.projectId,
    factIds,
  });
  const evidenceQuotes = await fetchFactEvidenceQuotes({
    projectId: input.projectId,
    factIds,
  });

  const factMap = new Map(facts.map((fact) => [fact.id, fact] as const));

  return rows
    .map((row) => {
      const invalidated = factMap.get(row.invalidatedFactId);
      const invalidating = factMap.get(row.invalidatingFactId);
      if (!invalidated || !invalidating) return null;

      return {
        conflictId: row.conflictId,
        reason: row.reason,
        invalidatedFact: buildConflictFactSummary({
          row: invalidated,
          evidenceCount: evidenceCounts.get(invalidated.id) ?? 0,
          evidenceQuotes: evidenceQuotes.get(invalidated.id) ?? [],
          entityInfo,
        }),
        invalidatingFact: buildConflictFactSummary({
          row: invalidating,
          evidenceCount: evidenceCounts.get(invalidating.id) ?? 0,
          evidenceQuotes: evidenceQuotes.get(invalidating.id) ?? [],
          entityInfo,
        }),
      };
    })
    .filter((item): item is MemoryConflictQueueItem => item !== null);
}
