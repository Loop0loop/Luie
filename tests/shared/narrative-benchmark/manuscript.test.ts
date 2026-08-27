import { describe, expect, it } from "vitest";
import { createValidInput, issueMessages } from "./fixture";

function addAlternateContinuity(input: ReturnType<typeof createValidInput>): void {
  input.corpus.continuities.push({
    continuityId: "alternate",
    label: "대체선",
    parentContinuityId: null,
    divergenceChapter: null,
  });
}

describe("narrative benchmark manuscript consistency", () => {
  it("rejects a chapter event from another continuity", () => {
    const input = createValidInput();
    addAlternateContinuity(input);
    input.corpus.events[0].continuityId = "alternate";
    expect(issueMessages(input)).toContain(
      "Chapter event continuity mismatch: event-hidden-source",
    );
  });

  it("rejects a scene event absent from its chapter plan", () => {
    const input = createValidInput();
    input.corpus.chapters[0].eventIds = ["event-private-number-found"];
    expect(issueMessages(input)).toContain(
      "Scene event is absent from chapter plan: event-hidden-source",
    );
  });

  it("requires firstNarratedChapter to match the earliest chapter plan", () => {
    const input = createValidInput();
    input.corpus.events[0].firstNarratedChapter = 2;
    expect(issueMessages(input)).toContain(
      "Event firstNarratedChapter must match its earliest chapter",
    );
  });

  it("rejects duplicate scene order within a chapter", () => {
    const input = createValidInput();
    input.corpus.scenes[1].chapterId = "chapter-one";
    expect(issueMessages(input)).toContain(
      "Scene order must be unique within a chapter",
    );
  });

  it("requires evidence continuity to match its scene", () => {
    const input = createValidInput();
    addAlternateContinuity(input);
    input.corpus.evidence[0].continuityId = "alternate";
    expect(issueMessages(input)).toContain("Evidence continuity must match scene");
  });

  it("requires relationship and knowledge evidence continuity", () => {
    const input = createValidInput();
    addAlternateContinuity(input);
    input.corpus.relationshipStates[0].continuityId = "alternate";
    input.corpus.knowledgeStates[0].continuityId = "alternate";
    const messages = issueMessages(input);
    expect(messages).toContain(
      "Relationship evidence continuity mismatch: evidence-hidden-source",
    );
    expect(messages).toContain(
      "Knowledge evidence continuity mismatch: evidence-private-number",
    );
  });
});
