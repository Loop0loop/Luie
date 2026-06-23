import type {
  LlmRuntimeInfo,
  MemoryConflictQueueItem,
  MemoryEntityReviewItem,
  MemoryEntityAliasReviewItem,
  MemoryEpisodeReviewItem,
  MemoryEpisodeCalibrationResult,
  MemoryEvalLiveRunnerResult,
  MemoryReviewStaleEvidenceItem,
  MemoryStaleEvidenceReviewAction,
  NarrativeMemoryIntentCalibrationResult,
  NarrativeSummaryStatus,
  MemoryTemporalFactReviewItem,
  RagQaErrorPayload,
  RagQaEvidence,
  RagQaGrounding,
  RagQaSafety,
  RagQaStreamPayload,
  UtilitySidecarStatus,
  RagSearchOptimizationMode,
} from "@shared/types";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: RagQaEvidence[];
  grounding?: RagQaGrounding;
  safety?: RagQaSafety;
  narrativeMemory?: {
    intent:
      | "evidence-trace"
      | "entity-profile"
      | "entity-state-at-chapter"
      | "relationship-at-chapter"
      | "event-causality"
      | "contradiction-check"
      | "unresolved-thread-check"
      | "global-summary";
    status: "found" | "insufficient_evidence" | "conflicting";
    trace: Array<{
      source:
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
      decision: "selected" | "skipped";
      reason: string;
    }>;
    factCount: number;
    evidenceCount: number;
  };
  isStreaming?: boolean;
  error?: string;
};

export type RuntimePreference = "auto" | "sidecar" | "ollama" | "openai" | "gemini";
export type MemoryScope = "current-only" | "with-prior";
export type ConflictReviewFilter = "active" | "deferred";
export type SearchOptimizationMode = RagSearchOptimizationMode;

export type GroundingStatus = NonNullable<Message["grounding"]>["status"];

export type AnalysisRagStreamPayload = RagQaStreamPayload;
export type AnalysisRagErrorPayload = RagQaErrorPayload;
export type AnalysisRuntimeInfo = LlmRuntimeInfo | null;
export type AnalysisSidecarStatus = UtilitySidecarStatus | null;
export type AnalysisConflictItem = MemoryConflictQueueItem;
export type AnalysisEntityReviewItem = MemoryEntityReviewItem;
export type AnalysisEntityAliasReviewItem = MemoryEntityAliasReviewItem;
export type AnalysisEpisodeReviewItem = MemoryEpisodeReviewItem;
export type AnalysisFactReviewItem = MemoryTemporalFactReviewItem;
export type AnalysisStaleEvidenceReviewItem = MemoryReviewStaleEvidenceItem;
export type AnalysisStaleEvidenceReviewAction = MemoryStaleEvidenceReviewAction;
export type AnalysisNarrativeSummaryStatus = NarrativeSummaryStatus;
export type AnalysisMemoryEvalReport = MemoryEvalLiveRunnerResult;
export type AnalysisIntentCalibrationReport = NarrativeMemoryIntentCalibrationResult;
export type AnalysisEpisodeCalibrationReport = MemoryEpisodeCalibrationResult;
