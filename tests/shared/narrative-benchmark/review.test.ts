import { describe, expect, it } from "vitest";
import { createValidInput, issueMessages, revision } from "./fixture";

describe("narrative benchmark review lifecycle", () => {
  it("requires review to become stale when the target revision changes", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].revision = revision("reasoning-query-updated");
    expect(issueMessages(input)).toContain(
      "Review must be stale after target revision changes",
    );
  });

  it("rejects benchmark eligibility without approved GOOD query review", () => {
    const input = createValidInput();
    input.corpus.humanReviews = input.corpus.humanReviews.filter(
      (review) => review.targetType !== "reasoning_query",
    );
    expect(issueMessages(input)).toContain(
      "Eligible reasoning query lacks approved GOOD review: query-why-trust-collapsed",
    );
  });

  it("requires approved manuscript review for every eligible source", () => {
    const input = createValidInput();
    input.corpus.humanReviews = input.corpus.humanReviews.filter(
      (review) => review.targetId !== "source-chapter-two",
    );
    expect(issueMessages(input)).toContain(
      "Eligible source document lacks approved GOOD manuscript review: source-chapter-two",
    );
  });

  it("requires both retrieval and reasoning queries for eligibility", () => {
    const input = createValidInput();
    input.corpus.retrievalQueries = [];
    input.corpus.reasoningQueries = [];
    input.corpus.humanReviews = input.corpus.humanReviews.filter(
      (review) =>
        review.targetType !== "retrieval_query" &&
        review.targetType !== "reasoning_query",
    );

    const messages = issueMessages(input);
    expect(messages).toContain(
      "Eligible benchmark requires at least one retrieval query",
    );
    expect(messages).toContain(
      "Eligible benchmark requires at least one reasoning query",
    );
  });
});
