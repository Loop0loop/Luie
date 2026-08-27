import { describe, expect, it } from "vitest";
import { createValidInput, issueMessages, sha } from "./fixture";

describe("narrative benchmark scope and evidence", () => {
  it("rejects future evidence when includeFuture is false", () => {
    const input = createValidInput();
    input.corpus.retrievalQueries[0].expectedEvidenceIds = ["evidence-private-number"];
    expect(issueMessages(input)).toContain(
      "Future evidence is not allowed: evidence-private-number",
    );
  });

  it("rejects continuity that is both allowed and forbidden", () => {
    const input = createValidInput();
    input.corpus.retrievalQueries[0].scope.forbiddenContinuityIds = ["prime"];
    expect(issueMessages(input)).toContain(
      "Continuity is both allowed and forbidden: prime",
    );
  });

  it("rejects evidence with incorrect code-point quote or source hash", () => {
    const input = createValidInput();
    input.corpus.evidence[0].quote = "잘못된 인용";
    input.corpus.evidence[0].sourceSha256 = sha("wrong source");
    const messages = issueMessages(input);
    expect(messages).toContain("Evidence source hash mismatch");
    expect(messages).toContain("Evidence quote does not match code-point offsets");
  });
});
