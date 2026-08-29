import { describe, expect, it } from "vitest";
import { canonicalRevision } from "../../../src/shared/utils/canonicalRevision";
import {
  createValidInput,
  issueMessages,
  refreshQueryAndReview,
} from "./fixture";

describe("narrative benchmark lifecycle contracts", () => {
  it("computes the same canonical revision regardless of object key order", () => {
    expect(canonicalRevision({ beta: [2, 1], alpha: "value" })).toBe(
      canonicalRevision({ alpha: "value", beta: [2, 1] }),
    );
  });

  it("rejects query payload changes without a revision update", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].question = "변경된 질문";
    expect(issueMessages(input)).toContain(
      "Query revision does not match canonical payload",
    );
  });

  it("accepts a query change after revision and review are refreshed", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].question = "관계가 무너진 직접 계기는 무엇인가?";
    refreshQueryAndReview(input, input.corpus.reasoningQueries[0]);
    expect(issueMessages(input)).toEqual([]);
  });

  it("rejects timeline eventTime that differs from its event", () => {
    const input = createValidInput();
    input.corpus.timeline[0].eventTime = "different-time";
    expect(issueMessages(input)).toContain(
      "Timeline eventTime must match event",
    );
  });

  it("rejects timeline narrativeChapter without the event", () => {
    const input = createValidInput();
    input.corpus.timeline[0].narrativeChapter = 2;
    expect(issueMessages(input)).toContain(
      "Timeline narrativeChapter must contain the event",
    );
  });

  it("requires every event to have a matching first timeline entry", () => {
    const input = createValidInput();
    input.corpus.timeline = input.corpus.timeline.filter(
      (entry) => entry.eventId !== "event-hidden-source",
    );
    expect(issueMessages(input)).toContain(
      "Event lacks matching first timeline entry",
    );
  });

  it("rejects a review stage-target mismatch", () => {
    const input = createValidInput();
    input.corpus.humanReviews[0].stage = "manuscript";
    expect(issueMessages(input)).toContain(
      "Review stage does not allow target type",
    );
  });

  it("rejects duplicate reasoning modes", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].modes = [
      "oracle_context",
      "oracle_context",
    ];
    refreshQueryAndReview(input, input.corpus.reasoningQueries[0]);
    expect(issueMessages(input)).toContain(
      "Reasoning query modes must be unique",
    );
  });

  it("requires both reasoning modes for an eligible query", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].modes = ["oracle_context"];
    refreshQueryAndReview(input, input.corpus.reasoningQueries[0]);
    expect(issueMessages(input)).toContain(
      "Eligible reasoning query requires both evaluation modes",
    );
  });

  it("allows one reasoning mode for a noneligible draft", () => {
    const input = createValidInput();
    input.corpus.manifest.benchmarkEligibility = false;
    input.corpus.reasoningQueries[0].modes = ["end_to_end"];
    refreshQueryAndReview(input, input.corpus.reasoningQueries[0]);
    expect(issueMessages(input)).toEqual([]);
  });
});
