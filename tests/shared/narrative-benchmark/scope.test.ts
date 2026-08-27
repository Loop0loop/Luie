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

  it("rejects a source hash that does not match its actual content", () => {
    const input = createValidInput();
    const forgedHash = sha("forged source");
    input.sourceDocuments[0].sha256 = forgedHash;
    input.corpus.evidence[0].sourceSha256 = forgedHash;
    const review = input.corpus.humanReviews.find(
      (record) => record.targetId === "source-chapter-one",
    );
    if (!review) throw new Error("Missing source review fixture");
    review.reviewedRevision = forgedHash;

    expect(issueMessages(input)).toContain("Source document content hash mismatch");
  });
});
