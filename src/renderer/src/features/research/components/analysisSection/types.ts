import type {
  LlmRuntimeInfo,
  MemoryConflictQueueItem,
  RagQaErrorPayload,
  RagQaEvidence,
  RagQaGrounding,
  RagQaStreamPayload,
  UtilitySidecarStatus,
} from "@shared/types";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: RagQaEvidence[];
  grounding?: RagQaGrounding;
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

export type GroundingStatus = NonNullable<Message["grounding"]>["status"];

export type AnalysisRagStreamPayload = RagQaStreamPayload;
export type AnalysisRagErrorPayload = RagQaErrorPayload;
export type AnalysisRuntimeInfo = LlmRuntimeInfo | null;
export type AnalysisSidecarStatus = UtilitySidecarStatus | null;
export type AnalysisConflictItem = MemoryConflictQueueItem;

