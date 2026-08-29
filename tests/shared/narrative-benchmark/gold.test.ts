import { describe, expect, it } from "vitest";
import {
  createValidInput,
  issueMessages,
  refreshQueryRevision,
  revision,
} from "./fixture";

describe("narrative benchmark typed gold", () => {
  it("accepts entity, fact, relationship state/change, and knowledge gold", () => {
    const input = createValidInput();
    input.corpus.manifest.benchmarkEligibility = false;
    input.corpus.characters[1].aliases.push({
      aliasId: "alias-haejun-short",
      value: "해준",
      validFromChapter: 1,
      validToChapter: null,
      continuityId: "prime",
    });
    input.corpus.retrievalQueries.push({
      queryId: "query-who-is-haejun",
      taxonomy: "entity_retrieval",
      secondaryTaxonomies: [],
      question: "해준은 누구인가?",
      genre: "mystery",
      difficulty: "single_hop",
      scope: {
        allowedUntilChapter: 1,
        includeFuture: false,
        allowedContinuityIds: ["prime"],
        forbiddenContinuityIds: [],
      },
      revision: revision("entity-query"),
      benchmarkLayer: "retrieval",
      expectedAnswer: {
        answerKind: "entity",
        characterIds: ["char-haejun"],
        aliasIds: ["alias-haejun-short"],
        mentionEvidenceIds: ["evidence-hidden-source"],
      },
      expectedEvidenceIds: ["evidence-hidden-source"],
    });
    input.corpus.reasoningQueries.push(
      {
        queryId: "query-trust-state",
        taxonomy: "relationship_state",
        secondaryTaxonomies: [],
        question: "1화 시점 세연이 해준을 얼마나 신뢰하는가?",
        genre: "mystery",
        difficulty: "single_hop",
        scope: {
          allowedUntilChapter: 1,
          includeFuture: false,
          allowedContinuityIds: ["prime"],
          forbiddenContinuityIds: [],
        },
        revision: revision("relationship-state-query"),
        benchmarkLayer: "reasoning",
        modes: ["oracle_context"],
        expectedAnswer: {
          answerKind: "relationship_state",
          relationshipStateIds: ["relationship-trust-before"],
          validAtChapter: 1,
        },
        requiredEvidenceIds: ["evidence-hidden-source"],
        forbiddenClaimIds: [],
      },
      {
        queryId: "query-seyeon-knowledge",
        taxonomy: "character_knowledge",
        secondaryTaxonomies: [],
        question: "2화 시점 세연은 비공개 번호를 아는가?",
        genre: "mystery",
        difficulty: "single_hop",
        scope: {
          allowedUntilChapter: 2,
          includeFuture: false,
          allowedContinuityIds: ["prime"],
          forbiddenContinuityIds: [],
        },
        revision: revision("knowledge-query"),
        benchmarkLayer: "reasoning",
        modes: ["oracle_context"],
        expectedAnswer: {
          answerKind: "knowledge_state",
          knowledgeStateIds: ["knowledge-private-number"],
          validAtChapter: 2,
        },
        requiredEvidenceIds: ["evidence-private-number"],
        forbiddenClaimIds: [],
      },
    );

    for (const query of [
      ...input.corpus.retrievalQueries.slice(1),
      ...input.corpus.reasoningQueries.slice(1),
    ]) {
      refreshQueryRevision(query);
    }
    expect(issueMessages(input)).toEqual([]);
  });

  it("rejects unconfirmed proposition as fact gold", () => {
    const input = createValidInput();
    input.corpus.propositions[1].canonicalStatus = "rejected";
    expect(issueMessages(input)).toContain(
      "Retrieval fact gold is not confirmed: prop-haejun-hid-source",
    );
  });

  it("rejects fact retrieval without fact gold", () => {
    const input = createValidInput();
    input.corpus.retrievalQueries[0].expectedAnswer = { answerKind: "evidence" };
    expect(issueMessages(input)).toContain("fact_retrieval requires fact gold");
  });

  it("rejects relationship change without transition gold", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].expectedAnswer = {
      answerKind: "causal_chain",
      eventIds: ["event-hidden-source", "event-private-number-found"],
    };
    expect(issueMessages(input)).toContain(
      "relationship_change requires relationship_change gold",
    );
  });

  it("rejects character knowledge without knowledge-state gold", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].taxonomy = "character_knowledge";
    expect(issueMessages(input)).toContain(
      "character_knowledge requires knowledge_state gold",
    );
  });
});
