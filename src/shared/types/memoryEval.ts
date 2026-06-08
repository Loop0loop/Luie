import type { RagQaEvidence, RagQaGroundingStatus } from "./search";

export type MemoryEvalCaseType = "qa" | "entity" | "relation" | "temporal_state";

export type MemoryEvalSeverity = "p0" | "p1" | "p2";

export type MemoryEvalP0Failure =
  | "unsupported_confirmed_answer"
  | "deleted_or_draft_fact_confirmed"
  | "future_fact_used_in_past_answer"
  | "relation_direction_reversed";

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
  expectedRelations?: MemoryEvalExpectedRelation[];
}

export interface MemoryEvalExpectedRelation {
  sourceName: string;
  targetName: string;
  relation: string;
}

export interface MemoryEvalObservedFact {
  id: string;
  status: string;
  observedAtChapterOrder?: number | null;
  usedAs?: RagQaGroundingStatus;
}

export interface MemoryEvalObservedRelation {
  sourceName: string;
  targetName: string;
  relation: string;
}

export interface MemoryEvalScoreInput {
  evalCase: MemoryEvalCaseDefinition;
  retrievedEvidence: RagQaEvidence[];
  groundingStatus: RagQaGroundingStatus;
  topK: number;
  queryChapterOrder?: number | null;
  observedFacts?: MemoryEvalObservedFact[];
  observedRelations?: MemoryEvalObservedRelation[];
}

export interface MemoryEvalSuiteCaseInput {
  evalCase: MemoryEvalCaseDefinition;
  retrievedEvidence: RagQaEvidence[];
  groundingStatus: RagQaGroundingStatus;
  queryChapterOrder?: number | null;
  observedFacts?: MemoryEvalObservedFact[];
  observedRelations?: MemoryEvalObservedRelation[];
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

export interface MemoryEvalAnswererInput {
  projectId: string;
  caseId: string;
  question: string;
  expectedAnswer?: string | null;
  caseType?: MemoryEvalCaseType;
}

export interface MemoryEvalAnswererResult {
  answer: string;
  groundingStatus: RagQaGroundingStatus;
  evidence: RagQaEvidence[];
  queryChapterOrder?: number | null;
  observedFacts?: MemoryEvalObservedFact[];
  observedRelations?: MemoryEvalObservedRelation[];
}

export interface MemoryEvalLiveRunnerInput {
  projectId: string;
  label: string;
  engineVersion: string;
  topK: number;
  nowIso?: string;
  answerer: (input: MemoryEvalAnswererInput) => Promise<MemoryEvalAnswererResult>;
}

export interface MemoryEvalRunRequest {
  projectId: string;
  label: string;
  topK?: number;
}

export interface MemoryEvalLiveRunnerResult extends MemoryEvalSuiteResult {
  runId: string;
}
