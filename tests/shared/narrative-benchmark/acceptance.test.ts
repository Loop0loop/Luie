import { describe, expect, it } from "vitest";
import { createValidInput, issueMessages, revision } from "./fixture";

describe("narrative benchmark acceptance integrity", () => {
  it("requires fact gold evidence to cover its proposition", () => {
    const input = createValidInput();
    input.corpus.retrievalQueries[0].expectedAnswer = {
      answerKind: "fact",
      propositionIds: ["prop-source-is-private"],
    };
    expect(issueMessages(input)).toContain(
      "Fact evidence is missing from query gold: evidence-private-number",
    );
  });

  it("requires entity mention evidence in retrieval gold", () => {
    const input = createValidInput();
    input.corpus.retrievalQueries[0].taxonomy = "entity_retrieval";
    input.corpus.retrievalQueries[0].expectedAnswer = {
      answerKind: "entity",
      characterIds: ["char-haejun"],
      aliasIds: [],
      mentionEvidenceIds: ["evidence-private-number"],
    };
    expect(issueMessages(input)).toContain(
      "Entity mention evidence is missing from query gold: evidence-private-number",
    );
  });

  it("requires before and after evidence for relationship change gold", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].requiredEvidenceIds = [
      "evidence-hidden-source",
    ];
    expect(issueMessages(input)).toContain(
      "Relationship change evidence is missing from reasoning gold: evidence-private-number",
    );
  });

  it("requires canonical evidence for knowledge gold", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].taxonomy = "character_knowledge";
    input.corpus.reasoningQueries[0].expectedAnswer = {
      answerKind: "knowledge_state",
      knowledgeStateIds: ["knowledge-private-number"],
      validAtChapter: 2,
    };
    input.corpus.reasoningQueries[0].requiredEvidenceIds = [
      "evidence-hidden-source",
    ];
    expect(issueMessages(input)).toContain(
      "Knowledge evidence is missing from reasoning gold: evidence-private-number",
    );
  });

  it("rejects overlapping canonical relationship states", () => {
    const input = createValidInput();
    input.corpus.relationshipStates[0].validToChapter = null;
    expect(issueMessages(input)).toContain(
      "Relationship state intervals overlap: relationship-trust-before, relationship-trust-after",
    );
  });

  it("rejects overlapping canonical knowledge states", () => {
    const input = createValidInput();
    input.corpus.knowledgeStates.push({
      ...input.corpus.knowledgeStates[0],
      knowledgeStateId: "knowledge-conflict",
      state: "misinformed",
      revision: revision("knowledge-conflict"),
    });
    expect(issueMessages(input)).toContain(
      "Knowledge state intervals overlap: knowledge-private-number, knowledge-conflict",
    );
  });
});
