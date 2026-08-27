import { describe, expect, it } from "vitest";
import { createValidInput, issueMessages } from "./fixture";

describe("narrative benchmark narrative invariants", () => {
  it("rejects a causal cycle", () => {
    const input = createValidInput();
    input.corpus.causalEdges.push({
      causalEdgeId: "causal-cycle",
      causeEventId: "event-private-number-found",
      effectEventId: "event-hidden-source",
      continuityId: "prime",
      strength: "direct",
      evidenceIds: ["evidence-private-number"],
    });
    expect(issueMessages(input)).toContain("Causal graph must be acyclic");
  });

  it("rejects knowledge that starts before its acquisition event", () => {
    const input = createValidInput();
    input.corpus.knowledgeStates[0].validFromChapter = 1;
    expect(issueMessages(input)).toContain(
      "Knowledge cannot start before acquisition event",
    );
  });

  it("rejects foreshadowing payoff that precedes setup", () => {
    const input = createValidInput();
    input.corpus.foreshadowing[0].setupEvidenceIds = ["evidence-private-number"];
    input.corpus.foreshadowing[0].payoffEvidenceIds = ["evidence-hidden-source"];
    expect(issueMessages(input)).toContain(
      "Foreshadowing payoff cannot precede setup",
    );
  });

  it("rejects a cycle in continuity parentage", () => {
    const input = createValidInput();
    input.corpus.continuities.push(
      {
        continuityId: "return", label: "회귀", parentContinuityId: "if-line",
        divergenceChapter: 1,
      },
      {
        continuityId: "if-line", label: "가정", parentContinuityId: "return",
        divergenceChapter: 1,
      },
    );
    expect(issueMessages(input)).toContain("Continuity parent graph must be acyclic");
  });

  it("rejects relationship transitions across different dimensions", () => {
    const input = createValidInput();
    input.corpus.relationshipStates[1].dimension = "hostility";
    expect(issueMessages(input)).toContain(
      "Relationship transition states must describe the same directed dimension",
    );
  });

  it("rejects relationship transitions without a value change", () => {
    const input = createValidInput();
    input.corpus.relationshipStates[1].value =
      input.corpus.relationshipStates[0].value;
    expect(issueMessages(input)).toContain(
      "Relationship transition must change value",
    );
  });

  it("requires an acquisition event for suspected knowledge", () => {
    const input = createValidInput();
    input.corpus.knowledgeStates[0].state = "suspected";
    input.corpus.knowledgeStates[0].acquiredByEventId = null;
    expect(issueMessages(input)).toContain(
      "suspected knowledge requires acquisition event",
    );
  });

  it("requires evidence for non-unknown knowledge", () => {
    const input = createValidInput();
    input.corpus.knowledgeStates[0].evidenceIds = [];
    expect(issueMessages(input)).toContain("known knowledge requires evidence");
  });

  it("allows a cause to be revealed after its effect", () => {
    const input = createValidInput();
    input.corpus.events[0].firstNarratedChapter = 2;
    input.corpus.events[1].firstNarratedChapter = 1;
    input.corpus.chapters[0].eventIds = ["event-private-number-found"];
    input.corpus.chapters[1].eventIds = ["event-hidden-source"];
    input.corpus.scenes[0].eventIds = ["event-private-number-found"];
    input.corpus.scenes[1].eventIds = ["event-hidden-source"];

    expect(issueMessages(input)).toEqual([]);
  });
});
