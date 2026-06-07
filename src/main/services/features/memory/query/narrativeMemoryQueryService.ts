import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import {
  chapter,
  memoryEpisodeEvidence,
  memoryEntity,
  memoryEntityAlias,
  memoryFact,
  memoryFactEvidence,
} from "../../../../database/schema/index.js";
import type {
  NarrativeMemoryFactResult,
  NarrativeMemoryQueryInput,
  NarrativeMemoryQueryIntent,
  NarrativeMemoryQueryResult,
  NarrativeMemorySource,
  RagQaEvidence,
} from "../../../../../shared/types/search.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { normalizeMemoryEntityName } from "../entity/memoryEntityResolution.js";
import { filterFactsValidAtChapter } from "../temporal/memoryTemporalFact.js";

export type NarrativeMemoryQueryPlan = {
  intent: NarrativeMemoryQueryIntent;
  sources: NarrativeMemorySource[];
  reason: string;
};

const logger = createLogger("NarrativeMemoryQueryService");

const RELATION_KEYWORDS = ["관계", "동맹", "적대", "배신", "보호", "소속", "relationship", "relation"];
const STATE_KEYWORDS = ["상태", "현재", "정체", "비밀", "아는", "알고", "생존", "죽", "위치", "state", "secret"];
const CAUSALITY_KEYWORDS = ["왜", "원인", "때문", "결과", "caus", "reason"];
const CONTRADICTION_KEYWORDS = ["충돌", "모순", "상충", "contradiction", "conflict"];
const EVIDENCE_KEYWORDS = ["근거", "출처", "원문", "어디", "evidence", "source"];
const THREAD_KEYWORDS = ["떡밥", "미회수", "열린", "unresolved", "thread"];
const SUMMARY_KEYWORDS = ["요약", "전체", "흐름", "summary", "overview"];
const PROFILE_KEYWORDS = ["프로필", "누구", "별칭", "등장", "profile", "alias"];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function parseChapterOrder(question: string): number | null {
  const match = /(\d+)\s*(?:화|장|chapter|챕터)/i.exec(question);
  if (!match) return null;
  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildNarrativeMemoryQueryPlan(question: string): NarrativeMemoryQueryPlan {
  const normalized = question.trim().toLowerCase();
  const hasChapterBoundary = parseChapterOrder(question) !== null || normalized.includes("기준");

  if (includesAny(normalized, CONTRADICTION_KEYWORDS)) {
    return {
      intent: "contradiction-check",
      sources: ["memory_fact_invalidation", "memory_fact"],
      reason: "question asks for conflicts or contradictions",
    };
  }

  if (includesAny(normalized, EVIDENCE_KEYWORDS)) {
    return {
      intent: "evidence-trace",
      sources: ["memory_chunk_evidence"],
      reason: "question asks for source evidence",
    };
  }

  if (includesAny(normalized, RELATION_KEYWORDS)) {
    return {
      intent: "relationship-at-chapter",
      sources: ["memory_relation_state", "memory_fact_evidence"],
      reason: hasChapterBoundary
        ? "question asks for a relationship at a bounded chapter"
        : "question asks for a relationship state",
    };
  }

  if (includesAny(normalized, STATE_KEYWORDS)) {
    return {
      intent: "entity-state-at-chapter",
      sources: ["memory_character_state", "memory_knowledge_state", "memory_fact_evidence"],
      reason: hasChapterBoundary
        ? "question asks for entity state at a bounded chapter"
        : "question asks for entity or knowledge state",
    };
  }

  if (includesAny(normalized, CAUSALITY_KEYWORDS)) {
    return {
      intent: "event-causality",
      sources: ["memory_episode", "memory_state_change_candidate"],
      reason: "question asks for event cause or consequence",
    };
  }

  if (includesAny(normalized, THREAD_KEYWORDS)) {
    return {
      intent: "unresolved-thread-check",
      sources: ["memory_episode", "memory_fact"],
      reason: "question asks for unresolved narrative threads",
    };
  }

  if (includesAny(normalized, SUMMARY_KEYWORDS)) {
    return {
      intent: "global-summary",
      sources: ["chapter_summary", "world_document"],
      reason: "question asks for global narrative summary",
    };
  }

  if (includesAny(normalized, PROFILE_KEYWORDS)) {
    return {
      intent: "entity-profile",
      sources: ["memory_entity", "memory_entity_mention", "memory_fact_evidence"],
      reason: "question asks for entity profile or identity",
    };
  }

  return {
    intent: "evidence-trace",
    sources: ["memory_chunk_evidence"],
    reason: "fallback to raw evidence trace",
  };
}

async function resolveChapterOrder(input: {
  question: string;
  projectId: string;
  chapterId?: string;
}): Promise<number | null> {
  const parsed = parseChapterOrder(input.question);
  if (parsed !== null) return parsed;
  if (!input.chapterId) return null;

  const rows = await db
    .getClient()
    .select({ order: chapter.order })
    .from(chapter)
    .where(and(eq(chapter.projectId, input.projectId), eq(chapter.id, input.chapterId)))
    .limit(1);
  return rows[0]?.order ?? null;
}

function predicatesForIntent(intent: NarrativeMemoryQueryIntent): string[] {
  switch (intent) {
    case "relationship-at-chapter":
      return ["allied_with", "hostile_to", "belongs_to", "betrayed", "protects", "seeks"];
    case "entity-state-at-chapter":
      return ["knows_secret", "revealed_identity", "located_at", "alive_status"];
    case "contradiction-check":
      return ["allied_with", "hostile_to", "belongs_to", "knows_secret", "revealed_identity", "alive_status"];
    default:
      return [];
  }
}

async function fetchTemporalFacts(input: {
  projectId: string;
  intent: NarrativeMemoryQueryIntent;
  sources: NarrativeMemorySource[];
  chapterOrder: number | null;
  entityId?: string;
  entityName?: string;
  entityType?: string;
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
  const temporalBoundary = input.chapterOrder === null
    ? undefined
    : and(
      lte(memoryFact.observedAtChapterOrder, input.chapterOrder),
      lte(memoryFact.validFromChapterOrder, input.chapterOrder),
      or(isNull(memoryFact.validToChapterOrder), gte(memoryFact.validToChapterOrder, input.chapterOrder)),
    );
  const filterEntityIds = await resolveMemoryEntityIds(input);
  if (filterEntityIds && filterEntityIds.length === 0) return [];
  const entityBoundary = filterEntityIds && filterEntityIds.length > 0
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
    .orderBy(desc(memoryFact.observedAtChapterOrder), desc(memoryFact.confidence))
    .limit(40);

  const bounded = input.chapterOrder === null
    ? rows.filter((row) => ["suggested", "confirmed", "conflicting"].includes(row.status))
    : filterFactsValidAtChapter(rows, input.chapterOrder);

  const selected = bounded.slice(0, 20);
  const evidenceCounts = await countFactEvidence({
    projectId: input.projectId,
    factIds: selected.map((row) => row.id),
  });
  const entityInfo = await loadEntityInfo({
    projectId: input.projectId,
    entityIds: selected.flatMap((row) => [row.subjectEntityId, row.objectEntityId].filter((id): id is string => id !== null)),
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

async function resolveMemoryEntityIds(input: {
  projectId: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
}): Promise<string[] | null> {
  if (input.entityName) {
    const normalizedName = normalizeMemoryEntityName(input.entityName);
    const normalizedType = input.entityType ? normalizeMemoryEntityName(input.entityType) : null;
    const canonicalRows = await db
      .getClient()
      .select({ id: memoryEntity.id })
      .from(memoryEntity)
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          normalizedType ? eq(memoryEntity.entityType, normalizedType) : undefined,
          sql`lower(${memoryEntity.canonicalName}) = ${normalizedName}`,
        ),
      )
      .limit(20);
    const aliasRows = await db
      .getClient()
      .select({ entityId: memoryEntityAlias.entityId })
      .from(memoryEntityAlias)
      .where(
        and(
          eq(memoryEntityAlias.projectId, input.projectId),
          normalizedType ? eq(memoryEntityAlias.entityType, normalizedType) : undefined,
          eq(memoryEntityAlias.normalizedAlias, normalizedName),
        ),
      )
      .limit(20);
    return [...new Set([
      ...canonicalRows.map((row) => row.id),
      ...aliasRows.map((row) => row.entityId),
    ])];
  }

  return input.entityId ? [input.entityId] : null;
}

async function loadEntityInfo(input: {
  projectId: string;
  entityIds: string[];
}): Promise<Map<string, { name: string; type: string }>> {
  const entityIds = [...new Set(input.entityIds)];
  if (entityIds.length === 0) return new Map();
  const rows = await db
    .getClient()
    .select({
      id: memoryEntity.id,
      name: memoryEntity.canonicalName,
      type: memoryEntity.entityType,
    })
    .from(memoryEntity)
    .where(and(eq(memoryEntity.projectId, input.projectId), inArray(memoryEntity.id, entityIds)));
  return new Map(rows.map((row) => [row.id, { name: row.name, type: row.type }]));
}

function resolveRelatedEntity(input: {
  fact: {
    subjectEntityId: string;
    objectEntityId: string | null;
    objectValue: string | null;
  };
  filterEntityIds: string[];
  entityInfo: Map<string, { name: string; type: string }>;
}): Pick<NarrativeMemoryFactResult, "relatedEntityId" | "relatedEntityName" | "relatedEntityType"> {
  const currentIds = new Set(input.filterEntityIds);
  const relatedId = currentIds.has(input.fact.subjectEntityId)
    ? input.fact.objectEntityId
    : input.fact.subjectEntityId;
  const relatedInfo = relatedId ? input.entityInfo.get(relatedId) : null;
  return {
    relatedEntityId: relatedId,
    relatedEntityName: relatedInfo?.name ?? input.fact.objectValue,
    relatedEntityType: relatedInfo?.type ?? null,
  };
}

async function countFactEvidence(input: {
  projectId: string;
  factIds: string[];
}): Promise<Map<string, number>> {
  if (input.factIds.length === 0) return new Map();
  const rows = await db
    .getClient()
    .select({
      factId: memoryFactEvidence.factId,
    })
    .from(memoryFactEvidence)
    .innerJoin(memoryEpisodeEvidence, eq(memoryEpisodeEvidence.id, memoryFactEvidence.evidenceId))
    .where(
      and(
        eq(memoryFactEvidence.projectId, input.projectId),
        eq(memoryEpisodeEvidence.projectId, input.projectId),
        inArray(memoryFactEvidence.factId, input.factIds),
      ),
    );

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.factId, (counts.get(row.factId) ?? 0) + 1);
  }
  return counts;
}

async function fetchFactEvidence(input: {
  projectId: string;
  facts: NarrativeMemoryFactResult[];
}): Promise<RagQaEvidence[]> {
  const factIds = input.facts.map((fact) => fact.id);
  if (factIds.length === 0) return [];

  const rows = await db
    .getClient()
    .select({
      factId: memoryFactEvidence.factId,
      chunkId: memoryEpisodeEvidence.chunkId,
      chapterId: memoryEpisodeEvidence.chapterId,
      startOffset: memoryEpisodeEvidence.startOffset,
      quote: memoryEpisodeEvidence.quote,
    })
    .from(memoryFactEvidence)
    .innerJoin(memoryEpisodeEvidence, eq(memoryEpisodeEvidence.id, memoryFactEvidence.evidenceId))
    .where(
      and(
        eq(memoryFactEvidence.projectId, input.projectId),
        eq(memoryEpisodeEvidence.projectId, input.projectId),
        inArray(memoryFactEvidence.factId, factIds),
      ),
    )
    .limit(20);

  return rows
    .filter((row) => row.chunkId !== null)
    .map((row) => ({
      chunkId: row.chunkId ?? row.factId,
      chapterId: row.chapterId ?? null,
      offset: row.startOffset ?? 0,
      quote: row.quote,
    }));
}

export function formatNarrativeMemoryQueryResult(result: NarrativeMemoryQueryResult): string {
  const trace = result.trace
    .map((step) => `- ${step.source}: ${step.decision} (${step.reason})`)
    .join("\n");
  const facts = result.facts.length > 0
    ? result.facts
      .map((fact) => {
        const object = fact.objectEntityId ?? fact.objectValue ?? "(none)";
        return [
          `- fact=${fact.id}`,
          `${fact.subjectEntityId} ${fact.predicate} ${object}`,
          `related=${fact.relatedEntityName ?? fact.relatedEntityId ?? "unknown"}`,
          `status=${fact.status}`,
          `confidence=${fact.confidence}`,
          `evidence=${fact.evidenceCount}`,
          `valid=${fact.validFromChapterOrder}-${fact.validToChapterOrder ?? "open"}`,
          `observed=${fact.observedAtChapterOrder}`,
        ].join(" | ");
      })
      .join("\n")
    : "- No sufficient narrative memory evidence. Treat this as a valid insufficient-evidence result.";
  const evidence = result.evidence.length > 0
    ? result.evidence
      .map((item, index) => `[M${index + 1}] chunk=${item.chunkId} chapter=${item.chapterId ?? "null"} offset=${item.offset}\n${item.quote}`)
      .join("\n\n")
    : "(no memory evidence spans)";

  return [
    `intent=${result.intent}`,
    `status=${result.status}`,
    "## Retrieval Trace",
    trace,
    "## Candidate Facts",
    facts,
    "## Memory Evidence",
    evidence,
  ].join("\n");
}

export class NarrativeMemoryQueryService {
  async query(input: NarrativeMemoryQueryInput): Promise<NarrativeMemoryQueryResult> {
    const plan = buildNarrativeMemoryQueryPlan(input.question);
    const trace = plan.sources.map((source) => ({
      source,
      decision: "selected" as const,
      reason: plan.reason,
    }));

    logger.info("Narrative memory query routed", {
      projectId: input.projectId,
      intent: plan.intent,
      sources: plan.sources,
      reason: plan.reason,
    });

    const chapterOrder = await resolveChapterOrder(input);
    const facts = await fetchTemporalFacts({
      projectId: input.projectId,
      intent: plan.intent,
      sources: plan.sources,
      chapterOrder,
      entityId: input.entityId,
      entityName: input.entityName,
      entityType: input.entityType,
    });
    const evidence = plan.sources.includes("memory_fact_evidence")
      ? await fetchFactEvidence({
        projectId: input.projectId,
        facts,
      })
      : [];
    const hasConflict = facts.some((fact) => fact.status === "conflicting");

    return {
      intent: plan.intent,
      status: hasConflict ? "conflicting" : evidence.length > 0 ? "found" : "insufficient_evidence",
      trace,
      facts,
      evidence,
    };
  }
}

export const narrativeMemoryQueryService = new NarrativeMemoryQueryService();
