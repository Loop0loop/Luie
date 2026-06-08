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
  parentWindow?: {
    chunkIds: string[];
    content: string;
    startOffset: number | null;
    endOffset: number | null;
    paragraphStartIndex: number | null;
    paragraphEndIndex: number | null;
  };
}

export interface MemoryChunkBacklink {
  chunkId: string;
  chapterId: string | null;
  offset: number;
  endOffset: number | null;
}

export interface MemoryChunkWindowQuery {
  projectId: string;
  chunkId: string;
  unit?: "chunk" | "paragraph";
  before?: number;
  after?: number;
}

export interface MemoryChunkWindowItem {
  chunkId: string;
  chunkIndex: number;
  chapterId: string | null;
  sceneId: string | null;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  paragraphStartIndex: number | null;
  paragraphEndIndex: number | null;
}

export interface MemoryChunkWindowResult {
  projectId: string;
  anchorChunkId: string;
  sourceType: string;
  sourceId: string;
  chapterId: string | null;
  sceneId: string | null;
  contextLabel: string | null;
  sourceContentHash: string;
  startOffset: number | null;
  endOffset: number | null;
  paragraphStartIndex: number | null;
  paragraphEndIndex: number | null;
  content: string;
  chunks: MemoryChunkWindowItem[];
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

export interface NarrativeSummaryStatusItem {
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
}

export interface NarrativeSummaryStatus {
  projectId: string;
  totalCount: number;
  staleCount: number;
  byType: Record<string, number>;
  summaries: NarrativeSummaryStatusItem[];
}

export interface MemoryEmbeddingStatus {
  projectId: string;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  completedCount: number;
  skippedCount?: number;
  chunkCount?: number;
  embeddingCount?: number;
  unembeddedChunkCount?: number;
  staleEmbeddingCount?: number;
  currentModel?: string | null;
  ready?: boolean;
}

export interface RagQaRequest {
  projectId: string;
  question: string;
  chapterId?: string;
  includePriorMemory?: boolean;
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
  "confirmed" | "inferred" | "insufficient_evidence" | "conflicting";

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

export interface MemoryConflictFactSummary {
  id: string;
  subjectEntityId: string;
  subjectEntityName: string | null;
  predicate: string;
  objectEntityId: string | null;
  objectEntityName: string | null;
  objectValue: string | null;
  valueType: string;
  validFromChapterOrder: number;
  validToChapterOrder: number | null;
  observedAtChapterOrder: number;
  confidence: number;
  status: string;
  evidenceCount: number;
}

export interface MemoryConflictQueueInput {
  projectId: string;
  chapterId?: string;
  includePriorMemory?: boolean;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  limit?: number;
}

export interface MemoryConflictQueueItem {
  conflictId: string;
  reason: string;
  invalidatedFact: MemoryConflictFactSummary;
  invalidatingFact: MemoryConflictFactSummary;
}

export interface MemoryConflictQueueResult {
  items: MemoryConflictQueueItem[];
}

export interface MemoryEpisodeReviewItem {
  id: string;
  projectId: string;
  sourceType: string;
  sourceId: string;
  chapterId: string | null;
  sceneId: string | null;
  episodeType: string;
  title: string;
  summary: string;
  status: string;
  confidence: number;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEpisodeReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryEpisodeReviewQueueResult {
  items: MemoryEpisodeReviewItem[];
}

export interface MemoryEpisodeRejectInput {
  projectId: string;
  episodeId: string;
  reason: string;
}

export interface MemoryEpisodeRejectResult {
  updated: boolean;
}

export interface MemoryTemporalFactReviewItem {
  id: string;
  projectId: string;
  subjectEntityId: string;
  subjectEntityName: string | null;
  predicate: string;
  objectEntityId: string | null;
  objectEntityName: string | null;
  objectValue: string | null;
  valueType: string;
  validFromChapterOrder: number;
  validToChapterOrder: number | null;
  observedAtChapterOrder: number;
  confidence: number;
  status: string;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryTemporalFactReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryTemporalFactReviewQueueResult {
  items: MemoryTemporalFactReviewItem[];
}

export interface MemoryTemporalFactConfirmInput {
  projectId: string;
  factId: string;
}

export interface MemoryTemporalFactRejectInput {
  projectId: string;
  factId: string;
  reason: string;
}

export interface MemoryTemporalFactConflictResolveInput {
  projectId: string;
  conflictId: string;
  winnerFactId: string;
  reason?: string;
}

export interface MemoryTemporalFactReviewMutationResult {
  updated: boolean;
  status?: "confirmed" | "rejected";
  canonicalExportable?: boolean;
}

export interface MemoryEntityAliasReviewItem {
  id: string;
  projectId: string;
  entityId: string;
  entityType: string;
  canonicalName: string;
  entityStatus: string;
  alias: string;
  normalizedAlias: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntityAliasReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryEntityAliasReviewQueueResult {
  items: MemoryEntityAliasReviewItem[];
}

export interface MemoryEntityReviewItem {
  id: string;
  projectId: string;
  entityType: string;
  canonicalName: string;
  status: string;
  confidence: number;
  createdBy: string;
  mentionCount: number;
  firstMentionChapterOrder: number | null;
  lastMentionChapterOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntityReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryEntityReviewQueueResult {
  items: MemoryEntityReviewItem[];
}

export interface MemoryEntityConfirmInput {
  projectId: string;
  entityId: string;
}

export interface MemoryEntityRejectInput {
  projectId: string;
  entityId: string;
}

export interface MemoryEntityReviewMutationResult {
  updated: boolean;
  status?: "confirmed" | "rejected";
  canonicalExportable?: boolean;
}

export interface MemoryEntityAliasConfirmInput {
  projectId: string;
  aliasId: string;
}

export interface MemoryEntityAliasRejectInput {
  projectId: string;
  aliasId: string;
}

export interface MemoryEntityAliasReviewMutationResult {
  updated: boolean;
}

export interface MemoryEntityMergeInput {
  projectId: string;
  targetEntityId: string;
  sourceEntityId: string;
}

export interface MemoryEntityMergeResult {
  updated: boolean;
}

export interface MemoryEntityAliasSplitInput {
  projectId: string;
  aliasId: string;
  canonicalName: string;
}

export interface MemoryEntityAliasSplitResult {
  updated: boolean;
  entityId: string | null;
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
