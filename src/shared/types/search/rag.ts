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
