import type { RuntimeRoutePlan } from "./llmRuntime";

export interface SearchIndexStatus {
  projectId: string;
  projectionCount: number;
  ftsCount: number | null;
  pendingQueueCount: number;
  pendingCount?: number;
  runningCount?: number;
  failedCount?: number;
  lastProcessedAt?: string | null;
}

export interface MemoryJobStatus {
  projectId: string;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  lastProcessedAt: string | null;
}

export interface MigrationHealth {
  chapterCount: number;
  chapterBodyCount: number;
  missingBodyCount: number;
  hashMismatchCount: number;
  hashMismatchSampled: boolean;
  vectorSearchEnabled: boolean;
  invalidEmbeddingCount: number;
  relationPointerMismatchCount: number;
}

export interface SearchQuery {
  projectId: string;
  query: string;
  type?: "all" | "character" | "term";
}

export interface SearchResult {
  type: "character" | "term" | "chapter";
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryChunkSearchQuery {
  projectId: string;
  query: string;
  limit?: number;
}

export interface MemoryChunkSearchResult {
  chunkId: string;
  chapterId: string | null;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  score: number;
}

export interface MemoryChunkBacklink {
  chunkId: string;
  chapterId: string | null;
  offset: number;
  endOffset: number | null;
}

export interface ChapterSummaryResult {
  chapterId: string;
  summary: string;
  isFallback: boolean;
  model: string | null;
  generatedAt: string;
}

export interface ChapterSummaryStatus {
  projectId: string;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  completedCount: number;
}

export interface MemoryEmbeddingStatus {
  projectId: string;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  completedCount: number;
  skippedCount?: number;
}

export interface RagQaRequest {
  projectId: string;
  question: string;
  chapterId?: string;
}

export interface UtilityRagQaRequest extends RagQaRequest {
  runtimePlan?: RuntimeRoutePlan;
}

export interface RagQaEvidence {
  chunkId: string;
  chapterId: string | null;
  offset: number;
  quote: string;
}

export type RagQaGroundingStatus =
  /** Reserved for a later claim-level verifier; Phase 0 never emits this. */
  | "confirmed"
  | "inferred"
  | "insufficient_evidence"
  | "conflicting";

export interface RagQaGrounding {
  status: RagQaGroundingStatus;
  note: string;
}

export interface RagQaResult {
  runId: string;
  projectId: string;
  question: string;
  answer: string;
  evidence: RagQaEvidence[];
  grounding: RagQaGrounding;
  narrativeMemory?: {
    intent: NarrativeMemoryQueryIntent;
    status: "found" | "insufficient_evidence" | "conflicting";
    trace: NarrativeMemoryTraceStep[];
    factCount: number;
    evidenceCount: number;
  };
  createdAt: string;
}

export interface RagQaRunHandle {
  runId: string;
}

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
}

export interface NarrativeMemoryQueryResult {
  intent: NarrativeMemoryQueryIntent;
  status: "found" | "insufficient_evidence" | "conflicting";
  trace: NarrativeMemoryTraceStep[];
  facts: NarrativeMemoryFactResult[];
  evidence: RagQaEvidence[];
}

export interface RagQaStreamPayload {
  runId: string;
  delta?: string;
  done: boolean;
  result?: RagQaResult;
}

export interface RagQaErrorPayload {
  runId?: string;
  code: string;
  message: string;
}
