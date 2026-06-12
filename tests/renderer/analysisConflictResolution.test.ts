import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection conflict resolution UI", () => {
  it("exposes conflict pair resolution actions", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/review/queue/ConflictQueuePanel.tsx",
      ),
      "utf8",
    );
    const queuesSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/review/queue/useMemoryReviewQueues.ts",
      ),
      "utf8",
    );
    const storeActionsSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/stores/analysis/actions/conflictQueueActions.ts",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("ConflictQueuePanel");
    expect(analysisSource).toContain("handleResolveConflict");
    expect(storeActionsSource).toContain("resolveFactConflict");
    expect(storeActionsSource).toContain("getConflictQueue");
    expect(panelSource).toContain("analysis.review.queue.conflict.acceptPrior");
    expect(panelSource).toContain("analysis.review.queue.conflict.acceptNew");
    expect(panelSource).toContain("onResolve");
    expect(panelSource).toContain("invalidatedFact.id");
    expect(panelSource).toContain("invalidatingFact.id");
    expect(panelSource).toContain("evidenceQuotes");
    expect(panelSource).toContain("renderEvidenceQuotes");
    expect(panelSource).toContain("onDefer");
    expect(queuesSource).toContain("handleDeferConflict");
  });
});
