import { describe, expect, it } from "vitest";
import { createValidInput, issueMessages } from "./fixture";

describe("narrative benchmark common guardrails", () => {
  it("rejects duplicate event IDs", () => {
    const input = createValidInput();
    input.corpus.events.push({ ...input.corpus.events[0] });
    expect(issueMessages(input)).toContain("Duplicate ID: event-hidden-source");
  });

  it("rejects a reversed valid chapter interval", () => {
    const input = createValidInput();
    input.corpus.goals[0].validFromChapter = 2;
    input.corpus.goals[0].validToChapter = 1;
    expect(issueMessages(input)).toContain(
      "validToChapter must be greater than or equal to validFromChapter",
    );
  });

  it("rejects GOOD review with rejected status", () => {
    const input = createValidInput();
    input.corpus.humanReviews[0].status = "rejected";
    expect(issueMessages(input)).toContain("GOOD review must be approved");
  });

  it("requires at least two continuities for cross-worldline difficulty", () => {
    const input = createValidInput();
    input.corpus.reasoningQueries[0].difficulty = "cross_worldline";
    expect(issueMessages(input)).toContain(
      "cross_worldline query requires at least two allowed continuities",
    );
  });

  it("requires payoff evidence for resolved foreshadowing", () => {
    const input = createValidInput();
    input.corpus.foreshadowing[0].payoffEvidenceIds = [];
    expect(issueMessages(input)).toContain(
      "Resolved foreshadowing requires payoff evidence",
    );
  });
});
