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

  it("blocks conflicting reviews without an adjudicator decision", () => {
    const input = createValidInput();
    const approved = input.corpus.humanReviews.find(
      (review) => review.targetType === "reasoning_query",
    );
    if (!approved) throw new Error("Missing reasoning review fixture");
    input.corpus.humanReviews.push({
      ...approved,
      reviewId: "review-reasoning-conflict",
      reviewerId: "reviewer-conflict",
      reviewerRole: "benchmark",
      label: "BAD",
      status: "rejected",
      reasonCodes: ["UNSUPPORTED_ANSWER"],
    });

    const messages = issueMessages(input);
    expect(messages).toContain(
      "Conflicting reviews require adjudication: query_gold:reasoning_query:query-why-trust-collapsed",
    );
    expect(messages).toContain(
      "Eligible reasoning query lacks approved GOOD review: query-why-trust-collapsed",
    );
  });

  it("uses a single adjudicator decision to resolve conflicting reviews", () => {
    const input = createValidInput();
    const approved = input.corpus.humanReviews.find(
      (review) => review.targetType === "reasoning_query",
    );
    if (!approved) throw new Error("Missing reasoning review fixture");
    input.corpus.humanReviews.push(
      {
        ...approved,
        reviewId: "review-reasoning-conflict",
        reviewerId: "reviewer-conflict",
        reviewerRole: "benchmark",
        label: "BAD",
        status: "rejected",
        reasonCodes: ["UNSUPPORTED_ANSWER"],
      },
      {
        ...approved,
        reviewId: "review-reasoning-adjudication",
        reviewerId: "reviewer-adjudicator",
        reviewerRole: "adjudicator",
      },
    );

    expect(issueMessages(input)).toEqual([]);
  });

  it("blocks eligibility when the adjudicator rejects the target", () => {
    const input = createValidInput();
    const approved = input.corpus.humanReviews.find(
      (review) => review.targetType === "reasoning_query",
    );
    if (!approved) throw new Error("Missing reasoning review fixture");
    input.corpus.humanReviews.push({
      ...approved,
      reviewId: "review-reasoning-adjudication-bad",
      reviewerId: "reviewer-adjudicator",
      reviewerRole: "adjudicator",
      label: "BAD",
      status: "rejected",
      reasonCodes: ["UNSUPPORTED_ANSWER"],
    });

    expect(issueMessages(input)).toContain(
      "Eligible reasoning query lacks approved GOOD review: query-why-trust-collapsed",
    );
  });
});
