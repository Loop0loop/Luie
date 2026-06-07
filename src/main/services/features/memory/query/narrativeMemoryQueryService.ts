import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import {
  chapter,
  memoryEpisodeEvidence,
  memoryFact,
  memoryFactEvidence,
} from "../../../../database/schema/index.js";
import type { RagQaEvidence } from "../../../../../shared/types/search.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { filterFactsValidAtChapter } from "../temporal/memoryTemporalFact.js";

export type NarrativeMemoryQueryIntent =
  | "evidence-trace"
  | "entity-profile"
  | "entity-state-at-chapter"
  | "relationship-at-chapter"
  | "event-causality"
  | "contradiction-check"
  | "unresolved-thread-check"
  | "global-summary";

export type NarrativeMemorySource =
  | "memory_chunk_evidence"
  | "memory_entity"
  | "memory_entity_mention"
  | "memory_relation_state"
  | "memory_character_state"
  | "memory_knowledge_state"
  | "memory_fact"
  | "memory_fact_evidence"
  | "memory_fact_invalidation"
  | "memory_episode"
  | "memory_state_change_candidate"
  | "chapter_summary"
  | "world_document";

export type NarrativeMemoryQueryPlan = {
  intent: NarrativeMemoryQueryIntent;
  sources: NarrativeMemorySource[];
  reason: string;
};

export type NarrativeMemoryTraceStep = {
  source: NarrativeMemorySource;
  decision: "selected" | "skipped";
  reason: string;
};

export type NarrativeMemoryFactResult = {
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
};

export type NarrativeMemoryQueryResult = {
  intent: NarrativeMemoryQueryIntent;
  status: "found" | "insufficient_evidence" | "conflicting";
  trace: NarrativeMemoryTraceStep[];
  facts: NarrativeMemoryFactResult[];
  evidence: RagQaEvidence[];
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
      ),
    )
    .orderBy(desc(memoryFact.observedAtChapterOrder), desc(memoryFact.confidence))
    .limit(40);

  const bounded = input.chapterOrder === null
    ? rows.filter((row) => ["suggested", "confirmed", "conflicting"].includes(row.status))
    : filterFactsValidAtChapter(rows, input.chapterOrder);

  return bounded.slice(0, 20).map((row) => ({
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
  }));
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
          `status=${fact.status}`,
          `confidence=${fact.confidence}`,
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
  async query(input: {
    projectId: string;
    question: string;
    chapterId?: string;
  }): Promise<NarrativeMemoryQueryResult> {
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
