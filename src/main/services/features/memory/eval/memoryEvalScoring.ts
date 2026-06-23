import type {
  MemoryEvalGoldEvidence,
  MemoryEvalP0Failure,
  MemoryEvalScoreInput,
  MemoryEvalScoreResult,
  MemoryEvalSuiteInput,
  MemoryEvalSuiteResult,
} from "../../../../../shared/types/index.js";
import type { RagQaEvidence } from "../../../../../shared/types/search.js";

function evidenceOffsetsOverlap(
  gold: MemoryEvalGoldEvidence,
  retrieved: RagQaEvidence,
): boolean {
  if (gold.chapterId === null || retrieved.chapterId !== gold.chapterId)
    return false;
  if (gold.startOffset === null || gold.endOffset === null) return false;
  const retrievedStart = retrieved.offset;
  const retrievedEnd = retrieved.offset + retrieved.quote.length;
  return retrievedStart < gold.endOffset && retrievedEnd > gold.startOffset;
}

function evidenceMatches(
  gold: MemoryEvalGoldEvidence,
  retrieved: RagQaEvidence,
): boolean {
  if (gold.expectedChunkId && gold.expectedChunkId === retrieved.chunkId)
    return true;
  return evidenceOffsetsOverlap(gold, retrieved);
}

function countEvidenceHits(
  goldEvidence: MemoryEvalGoldEvidence[],
  retrievedEvidence: RagQaEvidence[],
): number {
  return goldEvidence.filter((gold) =>
    retrievedEvidence.some((retrieved) => evidenceMatches(gold, retrieved)),
  ).length;
}

function collectP0Failures(
  input: MemoryEvalScoreInput,
  evidenceHitCount: number,
): MemoryEvalP0Failure[] {
  const failures = new Set<MemoryEvalP0Failure>();
  if (input.groundingStatus === "confirmed" && evidenceHitCount === 0) {
    failures.add("unsupported_confirmed_answer");
  }
  const expectedClaimTokens = extractClaimTokens(input.evalCase.expectedAnswer);
  const goldEvidenceText = input.evalCase.goldEvidence
    .map((evidence) => evidence.quote)
    .join(" ");
  const retrievedEvidenceText = input.retrievedEvidence
    .map((evidence) => evidence.quote)
    .join(" ");
  const supportText = `${goldEvidenceText} ${retrievedEvidenceText}`;
  const supportedExpectedTokenCount = countTokensPresent(
    expectedClaimTokens,
    supportText,
  );
  const expectedAnswerRequiresSupport = expectedClaimTokens.length >= 3;
  if (
    expectedAnswerRequiresSupport &&
    supportedExpectedTokenCount < Math.ceil(expectedClaimTokens.length * 0.5)
  ) {
    failures.add("expected_answer_not_supported_by_gold_evidence");
  }

  const answerClaimTokens = extractClaimTokens(input.answer);
  const answerUsesUnsupportedClaims =
    answerClaimTokens.length >= 3 &&
    countTokensPresent(answerClaimTokens, supportText) <
      Math.ceil(answerClaimTokens.length * 0.5);
  if (input.groundingStatus === "confirmed" && answerUsesUnsupportedClaims) {
    failures.add("answer_contains_unsupported_claim");
  }

  for (const fact of input.observedFacts ?? []) {
    const factUsedAsConfirmed =
      fact.usedAs === "confirmed" || input.groundingStatus === "confirmed";
    if (
      factUsedAsConfirmed &&
      (fact.status === "deleted" || fact.status === "draft")
    ) {
      failures.add("deleted_or_draft_fact_confirmed");
    }
    if (
      factUsedAsConfirmed &&
      input.queryChapterOrder !== undefined &&
      input.queryChapterOrder !== null &&
      fact.observedAtChapterOrder !== undefined &&
      fact.observedAtChapterOrder !== null &&
      fact.observedAtChapterOrder > input.queryChapterOrder
    ) {
      failures.add("future_fact_used_in_past_answer");
    }
  }

  for (const expected of input.evalCase.expectedRelations ?? []) {
    const expectedRelation = normalizeRelation(expected.relation);
    const expectedSource = normalizeName(expected.sourceName);
    const expectedTarget = normalizeName(expected.targetName);
    const hasReversed = (input.observedRelations ?? []).some(
      (observed) =>
        normalizeRelation(observed.relation) === expectedRelation &&
        normalizeName(observed.sourceName) === expectedTarget &&
        normalizeName(observed.targetName) === expectedSource,
    );
    if (hasReversed) {
      failures.add("relation_direction_reversed");
    }
  }

  for (const expected of input.evalCase.expectedEntities ?? []) {
    const expectedCanonical = normalizeName(expected.canonicalName);
    const expectedAliases = new Set(expected.aliases.map(normalizeName));
    const hasMismatchedAlias = (input.observedEntities ?? []).some(
      (observed) =>
        expectedAliases.has(normalizeName(observed.name)) &&
        normalizeName(observed.canonicalName) !== expectedCanonical,
    );
    if (hasMismatchedAlias) {
      failures.add("entity_alias_mismatch");
    }
  }

  for (const expected of input.evalCase.expectedThreads ?? []) {
    if (expected.status !== "unresolved") continue;
    const falselyResolved = (input.observedThreads ?? []).some(
      (observed) =>
        normalizeName(observed.name) === normalizeName(expected.name) &&
        observed.status === "resolved",
    );
    if (falselyResolved) {
      failures.add("unresolved_thread_falsely_marked_resolved");
    }
  }

  return Array.from(failures);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRelation(value: string): string {
  return value.trim().toLowerCase();
}

const CLAIM_TOKEN_STOPWORDS = new Set([
  "그리고",
  "그러나",
  "하지만",
  "때문",
  "통해",
  "대한",
  "것을",
  "것이",
  "것은",
  "있는",
  "없는",
  "한다",
  "했다",
  "하게",
  "되다",
  "된다",
  "되어",
  "에게",
  "에서",
  "으로",
  "라는",
  "이라고",
  "근거",
  "확인",
  "판단",
]);

function extractClaimTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  const normalized = value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => normalizeClaimToken(token.trim().toLowerCase()))
    .filter((token) => token.length >= 2 && !CLAIM_TOKEN_STOPWORDS.has(token));
  return Array.from(new Set(normalized));
}

function normalizeClaimToken(token: string): string {
  return token.replace(
    /(으로만|에게만|에서는|으로는|에게는|으로|에게|에서|부터|까지|처럼|보다|과는|와는|에는|의|은|는|이|가|을|를|와|과|도|만|로)$/u,
    "",
  );
}

function countTokensPresent(tokens: string[], text: string): number {
  const normalizedText = text.toLowerCase();
  return tokens.filter((token) => normalizedText.includes(token)).length;
}

export function scoreMemoryEvalCase(
  input: MemoryEvalScoreInput,
): MemoryEvalScoreResult {
  const retrievedTopK = input.retrievedEvidence.slice(
    0,
    Math.max(0, input.topK),
  );
  const evidenceHitCount = countEvidenceHits(
    input.evalCase.goldEvidence,
    retrievedTopK,
  );
  const evidenceMissCount = Math.max(
    0,
    input.evalCase.goldEvidence.length - evidenceHitCount,
  );
  const p0Failures = collectP0Failures(input, evidenceHitCount);

  return {
    caseId: input.evalCase.id,
    question: input.evalCase.question,
    answer: input.answer,
    retrievedEvidence: input.retrievedEvidence,
    evidenceHitCount,
    evidenceMissCount,
    contextRecallAtK:
      input.evalCase.goldEvidence.length === 0
        ? 0
        : evidenceHitCount / input.evalCase.goldEvidence.length,
    p0FailureCount: p0Failures.length,
    p0Failures,
  };
}

export function runMemoryEvalSuite(
  input: MemoryEvalSuiteInput,
): MemoryEvalSuiteResult {
  const results = input.cases.map((item) =>
    scoreMemoryEvalCase({
      ...item,
      answer: item.answer,
      topK: input.topK,
    }),
  );
  const totalRecall = results.reduce(
    (sum, item) => sum + item.contextRecallAtK,
    0,
  );
  const totalP0FailureCount = results.reduce(
    (sum, item) => sum + item.p0FailureCount,
    0,
  );
  const p0FailureTypeCounts = countP0FailureTypes(results);

  return {
    caseCount: results.length,
    averageContextRecallAtK:
      results.length === 0 ? 0 : totalRecall / results.length,
    totalP0FailureCount,
    p0FailureTypeCounts,
    results,
  };
}

function countP0FailureTypes(
  results: MemoryEvalScoreResult[],
): Partial<Record<MemoryEvalP0Failure, number>> {
  const counts: Partial<Record<MemoryEvalP0Failure, number>> = {};
  for (const result of results) {
    for (const failure of result.p0Failures) {
      counts[failure] = (counts[failure] ?? 0) + 1;
    }
  }
  return counts;
}
