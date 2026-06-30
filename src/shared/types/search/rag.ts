import type { RuntimeRoutePlan } from "../llmRuntime";
import type {
  NarrativeMemoryQueryIntent,
  NarrativeMemoryTraceStep,
} from "./narrative";

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

export type RagQaSafetyLabel =
  | "confirmed"
  | "inferred"
  | "insufficient_evidence"
  | "conflicting"
  | "blocked_p0"
  | "temporal_blocked"
  | "non_canonical_source";

export type RagQaAnswerMode = "EVIDENCE" | "INSUFFICIENT" | "ADVISORY";

export type RagQaSafetyReason =
  | RagQaGroundingStatus
  | "unsupported_confirmed_answer"
  | "answer_contains_unsupported_claim"
  | "expected_answer_not_supported_by_gold_evidence"
  | "deleted_or_draft_fact_confirmed"
  | "future_fact_used_in_past_answer"
  | "relation_direction_reversed"
  | "entity_alias_mismatch"
  | "unresolved_thread_falsely_marked_resolved"
  | "repeated_rejected_answer";

export interface RagQaSafety {
  label: RagQaSafetyLabel;
  message: string;
  blocksConfirmedAnswer: boolean;
  reasons: RagQaSafetyReason[];
}

export interface RagQaResult {
  runId: string;
  projectId: string;
  question: string;
  answer: string;
  answerMode: RagQaAnswerMode;
  evidence: RagQaEvidence[];
  grounding: RagQaGrounding;
  safety: RagQaSafety;
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
