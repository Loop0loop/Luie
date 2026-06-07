import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "../../../../../database/main/databaseService.js";
import {
  memoryFact,
} from "../../../../../database/schema/index.js";
import type { NarrativeMemoryFactResult } from "../../../../../../shared/types/search.js";
import { filterFactsValidAtChapter } from "../../temporal/memoryTemporalFact.js";
import { ACTIVE_FACT_STATUSES } from "./constants.js";
import { loadEntityInfo, resolveMemoryEntityIds, resolveRelatedEntity } from "./entity.js";
import {
  countFactEvidence,
} from "./evidence.js";
import type { NarrativeMemoryQueryIntent } from "../../../../../../shared/types/search.js";
import type { NarrativeMemorySource } from "../../../../../../shared/types/search.js";

function predicatesForIntent(intent: NarrativeMemoryQueryIntent): string[] {
  switch (intent) {
    case "relationship-at-chapter":
      return [
        "allied_with",
        "hostile_to",
        "belongs_to",
        "betrayed",
        "protects",
        "seeks",
      ];
    case "entity-state-at-chapter":
      return [
        "knows_secret",
        "revealed_identity",
        "located_at",
        "alive_status",
      ];
    case "contradiction-check":
      return [
        "allied_with",
        "hostile_to",
        "belongs_to",
        "knows_secret",
        "revealed_identity",
        "alive_status",
      ];
    default:
      return [];
  }
}

export async function fetchTemporalFacts(input: {
  projectId: string;
  intent: NarrativeMemoryQueryIntent;
  sources: NarrativeMemorySource[];
  chapterOrder: number | null;
  entityId?: string;
  entityName?: string;
  entityNames?: string[];
  entityType?: string;
  resolvedEntityIds?: string[] | null;
  includePriorMemory?: boolean;
}): Promise<NarrativeMemoryFactResult[]> {
  const shouldReadTemporalFacts = input.sources.some((source) =>
    [
      "memory_relation_state",
      "memory_character_state",
      "memory_knowledge_state",
      "memory_fact",
      "memory_fact_evidence",
    ].includes(source),
  );
  if (!shouldReadTemporalFacts) return [];

  const predicates = predicatesForIntent(input.intent);
  if (predicates.length === 0) return [];

  const temporalBoundary =
    input.chapterOrder === null
      ? undefined
      : and(
          input.includePriorMemory
            ? lte(memoryFact.observedAtChapterOrder, input.chapterOrder)
            : eq(memoryFact.observedAtChapterOrder, input.chapterOrder),
          lte(memoryFact.validFromChapterOrder, input.chapterOrder),
          or(
            isNull(memoryFact.validToChapterOrder),
            gte(memoryFact.validToChapterOrder, input.chapterOrder),
          ),
        );

  const filterEntityIds =
    input.resolvedEntityIds !== undefined
      ? input.resolvedEntityIds
      : await resolveMemoryEntityIds(input);
  if (filterEntityIds && filterEntityIds.length === 0) return [];
  const entityBoundary =
    filterEntityIds && filterEntityIds.length > 0
      ? or(
          inArray(memoryFact.subjectEntityId, filterEntityIds),
          inArray(memoryFact.objectEntityId, filterEntityIds),
        )
      : undefined;

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
      invalidatedByFactId: memoryFact.invalidatedByFactId,
    })
    .from(memoryFact)
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        inArray(memoryFact.predicate, predicates),
        temporalBoundary,
        entityBoundary,
      ),
    )
    .orderBy(
      desc(memoryFact.observedAtChapterOrder),
      desc(memoryFact.confidence),
    )
    .limit(40);

  const bounded =
    input.chapterOrder === null
      ? rows.filter((row) => ACTIVE_FACT_STATUSES.has(row.status))
      : filterFactsValidAtChapter(rows, input.chapterOrder);

  const selected = bounded.slice(0, 20);
  const evidenceCounts = await countFactEvidence({
    projectId: input.projectId,
    factIds: selected.map((row) => row.id),
  });
  const entityInfo = await loadEntityInfo({
    projectId: input.projectId,
    entityIds: selected.flatMap((row) =>
      [row.subjectEntityId, row.objectEntityId].filter(
        (id): id is string => id !== null,
      ),
    ),
  });

  return selected.map((row) => ({
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
    evidenceCount: evidenceCounts.get(row.id) ?? 0,
    ...resolveRelatedEntity({
      fact: row,
      filterEntityIds: filterEntityIds ?? [],
      entityInfo,
    }),
  }));
}
