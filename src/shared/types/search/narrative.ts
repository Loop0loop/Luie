import type { RagQaEvidence } from "./rag";

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

export interface NarrativeMemoryTraceStep {
  source: NarrativeMemorySource;
  decision: "selected" | "skipped";
  reason: string;
}

export interface NarrativeMemoryIntentCalibrationRequest {
  projectId: string;
  useLlm?: boolean;
}

export interface NarrativeMemoryIntentCalibrationFailure {
  caseId: string;
  reason:
    | "EXPECTED_INTENT_MISMATCH"
    | "EXPECTED_SOURCE_MISSING"
    | "CLASSIFIER_ERROR";
  detail?: string;
}

export interface NarrativeMemoryIntentCalibrationResult {
  caseCount: number;
  passCount: number;
  failures: NarrativeMemoryIntentCalibrationFailure[];
}

export interface MemoryEpisodeCalibrationRequest {
  projectId: string;
}

export interface MemoryEpisodeCalibrationFailure {
  caseId: string;
  reason:
    | "EXPECTED_EPISODE_NOT_FOUND"
    | "EXPECTED_EVIDENCE_CHUNK_NOT_FOUND"
    | "EXTRACTOR_ERROR";
  detail?: string;
}

export interface MemoryEpisodeCalibrationResult {
  caseCount: number;
  passCount: number;
  failures: MemoryEpisodeCalibrationFailure[];
}

export interface MemoryEntityProfile {
  id: string;
  canonicalName: string;
  entityType: string;
  status: string;
  aliases: string[];
  aliasCount: number;
  mentionCount: number;
  firstMentionChapterOrder: number | null;
  lastMentionChapterOrder: number | null;
}

export interface NarrativeMemoryFactResult {
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
  evidenceCount: number;
  relatedEntityId: string | null;
  relatedEntityName: string | null;
  relatedEntityType: string | null;
}

export interface NarrativeMemoryQueryInput {
  projectId: string;
  question: string;
  chapterId?: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  includePriorMemory?: boolean;
  entityNames?: string[];
}

export interface NarrativeMemoryQueryResult {
  intent: NarrativeMemoryQueryIntent;
  status: "found" | "insufficient_evidence" | "conflicting";
  trace: NarrativeMemoryTraceStep[];
  facts: NarrativeMemoryFactResult[];
  profiles?: MemoryEntityProfile[];
  evidence: RagQaEvidence[];
}
