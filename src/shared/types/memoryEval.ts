import type { RagQaEvidence, RagQaGroundingStatus } from "./search";

export type MemoryEvalCaseType = "qa" | "entity" | "relation" | "temporal_state";

export type MemoryEvalSeverity = "p0" | "p1" | "p2";

export type MemoryEvalP0Failure =
  | "unsupported_confirmed_answer"
  | "answer_contains_unsupported_claim"
  | "expected_answer_not_supported_by_gold_evidence"
  | "deleted_or_draft_fact_confirmed"
  | "future_fact_used_in_past_answer"
  | "relation_direction_reversed"
  | "entity_alias_mismatch"
  | "unresolved_thread_falsely_marked_resolved";

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
  queryChapterOrder?: number | null;
  severity?: MemoryEvalSeverity;
  goldEvidence: MemoryEvalGoldEvidence[];
  expectedEntities?: MemoryEvalExpectedEntity[];
  expectedRelations?: MemoryEvalExpectedRelation[];
  expectedThreads?: MemoryEvalExpectedThread[];
}

export interface MemoryEvalExpectedEntity {
  canonicalName: string;
  aliases: string[];
}

export interface MemoryEvalExpectedRelation {
  sourceName: string;
  targetName: string;
  relation: string;
}

export type MemoryEvalThreadStatus = "unresolved" | "resolved";

export interface MemoryEvalExpectedThread {
  name: string;
  status: MemoryEvalThreadStatus;
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

export interface MemoryEvalObservedEntity {
  canonicalName: string;
  name: string;
}

export interface MemoryEvalObservedThread {
  name: string;
  status: MemoryEvalThreadStatus;
}

export interface MemoryEvalScoreInput {
  evalCase: MemoryEvalCaseDefinition;
  answer?: string;
  retrievedEvidence: RagQaEvidence[];
  groundingStatus: RagQaGroundingStatus;
  topK: number;
  queryChapterOrder?: number | null;
  observedFacts?: MemoryEvalObservedFact[];
  observedEntities?: MemoryEvalObservedEntity[];
  observedRelations?: MemoryEvalObservedRelation[];
  observedThreads?: MemoryEvalObservedThread[];
}

export interface MemoryEvalSuiteCaseInput {
  evalCase: MemoryEvalCaseDefinition;
  answer?: string;
  retrievedEvidence: RagQaEvidence[];
  groundingStatus: RagQaGroundingStatus;
  queryChapterOrder?: number | null;
  observedFacts?: MemoryEvalObservedFact[];
  observedEntities?: MemoryEvalObservedEntity[];
  observedRelations?: MemoryEvalObservedRelation[];
  observedThreads?: MemoryEvalObservedThread[];
}

export interface MemoryEvalSuiteInput {
  cases: MemoryEvalSuiteCaseInput[];
  topK: number;
}

export interface MemoryEvalScoreResult {
  caseId: string;
  question: string;
  answer?: string;
  retrievedEvidence: RagQaEvidence[];
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
  p0FailureTypeCounts: Partial<Record<MemoryEvalP0Failure, number>>;
  results: MemoryEvalScoreResult[];
}

export type MemoryWriterTaskBenchmarkTaskId =
  | "setting-check"
  | "character-relation-check"
  | "thread-resolution-check"
  | "chapter-knowledge-state-check"
  | "draft-canon-conflict-check";

export interface MemoryWriterTaskBenchmarkTaskSummary {
  taskId: MemoryWriterTaskBenchmarkTaskId;
  caseCount: number;
  successCount: number;
  successRate: number;
  averageResponseTimeMs: number | null;
  evidenceSatisfactionRate: number;
  falseConfidenceRate: number;
  p0FailureCount: number;
}

export interface MemoryWriterTaskBenchmarkSummary {
  schemaVersion: 1;
  taskCount: number;
  caseCount: number;
  successRate: number;
  averageResponseTimeMs: number | null;
  evidenceSatisfactionRate: number;
  falseConfidenceRate: number;
  tasks: MemoryWriterTaskBenchmarkTaskSummary[];
}

export interface MemoryEvalAnswererInput {
  projectId: string;
  caseId: string;
  question: string;
  expectedAnswer?: string | null;
  caseType?: MemoryEvalCaseType;
  queryChapterOrder?: number | null;
}

export interface MemoryEvalAnswererResult {
  answer: string;
  groundingStatus: RagQaGroundingStatus;
  evidence: RagQaEvidence[];
  queryChapterOrder?: number | null;
  observedFacts?: MemoryEvalObservedFact[];
  observedEntities?: MemoryEvalObservedEntity[];
  observedRelations?: MemoryEvalObservedRelation[];
  observedThreads?: MemoryEvalObservedThread[];
}

export interface MemoryEvalAnswerJudgeInput {
  evalCase: MemoryEvalCaseDefinition;
  answer: string;
  evidence: RagQaEvidence[];
}

export interface MemoryEvalLiveRunnerInput {
  projectId: string;
  label: string;
  engineVersion: string;
  topK: number;
  nowIso?: string;
  answerer: (input: MemoryEvalAnswererInput) => Promise<MemoryEvalAnswererResult>;
  answerJudge?: (input: MemoryEvalAnswerJudgeInput) => Promise<string>;
}

export interface MemoryEvalRunRequest {
  projectId: string;
  label: string;
  topK?: number;
}

export type MemoryEvalFeedbackKind = "answer_wrong" | "evidence_helpful";

export interface MemoryEvalFeedbackRecordRequest {
  projectId: string;
  runId?: string | null;
  caseId?: string | null;
  resultId?: string | null;
  feedbackKind: MemoryEvalFeedbackKind;
  question: string;
  answer?: string | null;
  evidence?: RagQaEvidence[];
  note?: string | null;
  createEvalCaseCandidate?: boolean;
}

export interface MemoryEvalFeedbackRecordResult {
  id: string;
  evalCaseId?: string;
  evalEvidenceCount?: number;
}

export interface MemoryEvalLiveRunnerResult extends MemoryEvalSuiteResult {
  runId: string;
  writerTaskBenchmark: MemoryWriterTaskBenchmarkSummary;
}
