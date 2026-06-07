import type { RagQaEvidence, RagQaGroundingStatus } from "./search";

export type MemoryEvalCaseType = "qa" | "entity" | "relation" | "temporal_state";

export type MemoryEvalSeverity = "p0" | "p1" | "p2";

export type MemoryEvalP0Failure = "unsupported_confirmed_answer";

export interface MemoryEvalGoldEvidence {
  id: string;
  chapterId: string | null;
  expectedChunkId?: string | null;
  startOffset: number | null;
  endOffset: number | null;
  quote: string;
}

export interface MemoryEvalCaseDefinition {
  id: string;
  projectId: string;
  name: string;
  question: string;
  caseType?: MemoryEvalCaseType;
  expectedAnswer?: string | null;
  temporalScopeStartChapterId?: string | null;
  temporalScopeEndChapterId?: string | null;
  severity?: MemoryEvalSeverity;
  goldEvidence: MemoryEvalGoldEvidence[];
}

export interface MemoryEvalScoreInput {
  evalCase: MemoryEvalCaseDefinition;
  retrievedEvidence: RagQaEvidence[];
  groundingStatus: RagQaGroundingStatus;
  topK: number;
}

export interface MemoryEvalSuiteCaseInput {
  evalCase: MemoryEvalCaseDefinition;
  retrievedEvidence: RagQaEvidence[];
  groundingStatus: RagQaGroundingStatus;
}

export interface MemoryEvalSuiteInput {
  cases: MemoryEvalSuiteCaseInput[];
  topK: number;
}

export interface MemoryEvalScoreResult {
  caseId: string;
  evidenceHitCount: number;
  evidenceMissCount: number;
  contextRecallAtK: number;
  p0FailureCount: number;
  p0Failures: MemoryEvalP0Failure[];
}

export interface MemoryEvalSuiteResult {
  caseCount: number;
  averageContextRecallAtK: number;
  totalP0FailureCount: number;
  results: MemoryEvalScoreResult[];
}
