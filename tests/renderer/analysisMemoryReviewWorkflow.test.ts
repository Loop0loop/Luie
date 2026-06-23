import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection memory review workflow", () => {
  it("connects suggested memory review queues to accept/reject actions", () => {
    const analysisSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/AnalysisSection.tsx",
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
    const memoryReviewActionsSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/stores/analysis/actions/memoryReviewActions.ts",
      ),
      "utf8",
    );
    const staleEvidenceActionsSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/stores/analysis/actions/staleEvidenceActions.ts",
      ),
      "utf8",
    );
    const stalePanelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/review/queue/StaleEvidenceReviewPanel.tsx",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("FactReviewPanel");
    expect(analysisSource).toContain("EpisodeReviewPanel");
    expect(analysisSource).toContain("EntityReviewPanel");
    expect(analysisSource).toContain("EntityAliasReviewPanel");
    expect(analysisSource).toContain("StaleEvidenceReviewPanel");

    expect(memoryReviewActionsSource).toContain("getFactReviewQueue");
    expect(memoryReviewActionsSource).toContain("confirmFact");
    expect(memoryReviewActionsSource).toContain("rejectFact");
    expect(memoryReviewActionsSource).toContain("getEpisodeReviewQueue");
    expect(memoryReviewActionsSource).toContain("confirmEpisode");
    expect(memoryReviewActionsSource).toContain("rejectEpisode");
    expect(memoryReviewActionsSource).toContain("getEntityReviewQueue");
    expect(memoryReviewActionsSource).toContain("confirmEntity");
    expect(memoryReviewActionsSource).toContain("rejectEntity");
    expect(memoryReviewActionsSource).toContain("getEntityAliasReviewQueue");
    expect(memoryReviewActionsSource).toContain("confirmEntityAlias");
    expect(memoryReviewActionsSource).toContain("rejectEntityAlias");
    expect(memoryReviewActionsSource).toContain("splitEntityAlias");
    expect(memoryReviewActionsSource).toContain("mergeEntity");
    expect(staleEvidenceActionsSource).toContain("getReviewBacklog");
    expect(staleEvidenceActionsSource).toContain("reviewStaleEvidence");
    expect(staleEvidenceActionsSource).toContain("repairEvidenceLinks");
    expect(queuesSource).toContain("handleReviewStaleEvidence");
    expect(queuesSource).toContain("handleRepairStaleEvidence");
    expect(queuesSource).toContain("requestRejectReason");

    expect(stalePanelSource).toContain("defer");
    expect(stalePanelSource).toContain("reject");
    expect(stalePanelSource).toContain("resolve");
    expect(stalePanelSource).toContain("repair");
  });
});
