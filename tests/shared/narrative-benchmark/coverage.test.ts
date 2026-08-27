import { describe, expect, it } from "vitest";
import { createValidInput, issueMessages, revision } from "./fixture";

function addApprovedQueryReview(
  input: ReturnType<typeof createValidInput>,
  targetType: "retrieval_query" | "reasoning_query",
  targetId: string,
  reviewedRevision: string,
): void {
  input.corpus.humanReviews.push({
    reviewId: `review-${targetId}`,
    targetType,
    targetId,
    stage: "query_gold",
    reviewerId: "reviewer-coverage",
    reviewerRole: "benchmark",
    label: "GOOD",
    status: "approved",
    reasonCodes: [],
    comment: "현대 로맨스 필수 taxonomy query를 승인한다.",
    reviewedRevision,
    reviewedAt: "2026-08-28T00:00:00.000Z",
  });
}

function addModernRomanceCoverage(
  input: ReturnType<typeof createValidInput>,
): void {
  const entityRevision = revision("modern-romance-entity");
  input.corpus.retrievalQueries.push({
    queryId: "query-modern-romance-entity",
    taxonomy: "entity_retrieval",
    secondaryTaxonomies: [],
    question: "해준은 누구인가?",
    genre: "contemporary",
    difficulty: "single_hop",
    scope: {
      allowedUntilChapter: 1,
      includeFuture: false,
      allowedContinuityIds: ["prime"],
      forbiddenContinuityIds: [],
    },
    revision: entityRevision,
    benchmarkLayer: "retrieval",
    expectedAnswer: {
      answerKind: "entity",
      characterIds: ["char-haejun"],
      aliasIds: [],
      mentionEvidenceIds: ["evidence-hidden-source"],
    },
    expectedEvidenceIds: ["evidence-hidden-source"],
  });
  addApprovedQueryReview(
    input,
    "retrieval_query",
    "query-modern-romance-entity",
    entityRevision,
  );

  const stateRevision = revision("modern-romance-relationship-state");
  input.corpus.reasoningQueries.push({
    queryId: "query-modern-romance-relationship-state",
    taxonomy: "relationship_state",
    secondaryTaxonomies: [],
    question: "1화 시점 세연의 해준에 대한 신뢰 상태는?",
    genre: "romance",
    difficulty: "single_hop",
    scope: {
      allowedUntilChapter: 1,
      includeFuture: false,
      allowedContinuityIds: ["prime"],
      forbiddenContinuityIds: [],
    },
    revision: stateRevision,
    benchmarkLayer: "reasoning",
    modes: ["oracle_context", "end_to_end"],
    expectedAnswer: {
      answerKind: "relationship_state",
      relationshipStateIds: ["relationship-trust-before"],
      validAtChapter: 1,
    },
    requiredEvidenceIds: ["evidence-hidden-source"],
    forbiddenClaimIds: [],
  });
  addApprovedQueryReview(
    input,
    "reasoning_query",
    "query-modern-romance-relationship-state",
    stateRevision,
  );

  const knowledgeRevision = revision("modern-romance-knowledge");
  input.corpus.reasoningQueries.push({
    queryId: "query-modern-romance-knowledge",
    taxonomy: "character_knowledge",
    secondaryTaxonomies: [],
    question: "2화 시점 세연은 비공개 번호를 아는가?",
    genre: "contemporary",
    difficulty: "single_hop",
    scope: {
      allowedUntilChapter: 2,
      includeFuture: false,
      allowedContinuityIds: ["prime"],
      forbiddenContinuityIds: [],
    },
    revision: knowledgeRevision,
    benchmarkLayer: "reasoning",
    modes: ["oracle_context", "end_to_end"],
    expectedAnswer: {
      answerKind: "knowledge_state",
      knowledgeStateIds: ["knowledge-private-number"],
      validAtChapter: 2,
    },
    requiredEvidenceIds: ["evidence-private-number"],
    forbiddenClaimIds: [],
  });
  addApprovedQueryReview(
    input,
    "reasoning_query",
    "query-modern-romance-knowledge",
    knowledgeRevision,
  );
}

describe("modern romance taxonomy coverage", () => {
  it("requires all core taxonomies for eligibility", () => {
    const input = createValidInput();
    input.corpus.manifest.genres = ["contemporary", "romance"];
    input.corpus.retrievalQueries[0].genre = "contemporary";
    input.corpus.reasoningQueries[0].genre = "romance";

    const messages = issueMessages(input);
    expect(messages).toContain(
      "Eligible contemporary romance pack lacks retrieval taxonomy: entity_retrieval",
    );
    expect(messages).toContain(
      "Eligible contemporary romance pack lacks reasoning taxonomy: relationship_state",
    );
    expect(messages).toContain(
      "Eligible contemporary romance pack lacks reasoning taxonomy: character_knowledge",
    );
  });

  it("accepts complete core taxonomy coverage", () => {
    const input = createValidInput();
    input.corpus.manifest.genres = ["contemporary", "romance"];
    input.corpus.retrievalQueries[0].genre = "contemporary";
    input.corpus.reasoningQueries[0].genre = "romance";
    addModernRomanceCoverage(input);

    expect(issueMessages(input)).toEqual([]);
  });
});
