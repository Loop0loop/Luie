import type {
  MemoryEvalGoldEvidence,
  MemoryEvalP0Failure,
  MemoryEvalScoreInput,
  MemoryEvalScoreResult,
  MemoryEvalSuiteInput,
  MemoryEvalSuiteResult,
} from "../../../../../shared/types/index.js";
import type { RagQaEvidence } from "../../../../../shared/types/search.js";

function evidenceOffsetsOverlap(gold: MemoryEvalGoldEvidence, retrieved: RagQaEvidence): boolean {
  if (gold.chapterId === null || retrieved.chapterId !== gold.chapterId) return false;
  if (gold.startOffset === null || gold.endOffset === null) return false;
  const retrievedStart = retrieved.offset;
  const retrievedEnd = retrieved.offset + retrieved.quote.length;
  return retrievedStart < gold.endOffset && retrievedEnd > gold.startOffset;
}

function evidenceMatches(gold: MemoryEvalGoldEvidence, retrieved: RagQaEvidence): boolean {
  if (gold.expectedChunkId && gold.expectedChunkId === retrieved.chunkId) return true;
  return evidenceOffsetsOverlap(gold, retrieved);
}

function countEvidenceHits(goldEvidence: MemoryEvalGoldEvidence[], retrievedEvidence: RagQaEvidence[]): number {
  return goldEvidence.filter((gold) => retrievedEvidence.some((retrieved) => evidenceMatches(gold, retrieved))).length;
}

function collectP0Failures(input: MemoryEvalScoreInput, evidenceHitCount: number): MemoryEvalP0Failure[] {
  if (input.groundingStatus === "confirmed" && evidenceHitCount === 0) {
    return ["unsupported_confirmed_answer"];
  }
  return [];
}

export function scoreMemoryEvalCase(input: MemoryEvalScoreInput): MemoryEvalScoreResult {
  const retrievedTopK = input.retrievedEvidence.slice(0, Math.max(0, input.topK));
  const evidenceHitCount = countEvidenceHits(input.evalCase.goldEvidence, retrievedTopK);
  const evidenceMissCount = Math.max(0, input.evalCase.goldEvidence.length - evidenceHitCount);
  const p0Failures = collectP0Failures(input, evidenceHitCount);

  return {
    caseId: input.evalCase.id,
    evidenceHitCount,
    evidenceMissCount,
    contextRecallAtK: input.evalCase.goldEvidence.length === 0 ? 0 : evidenceHitCount / input.evalCase.goldEvidence.length,
    p0FailureCount: p0Failures.length,
    p0Failures,
  };
}

export function runMemoryEvalSuite(input: MemoryEvalSuiteInput): MemoryEvalSuiteResult {
  const results = input.cases.map((item) =>
    scoreMemoryEvalCase({
      ...item,
      topK: input.topK,
    }),
  );
  const totalRecall = results.reduce((sum, item) => sum + item.contextRecallAtK, 0);
  const totalP0FailureCount = results.reduce((sum, item) => sum + item.p0FailureCount, 0);

  return {
    caseCount: results.length,
    averageContextRecallAtK: results.length === 0 ? 0 : totalRecall / results.length,
    totalP0FailureCount,
    results,
  };
}
