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
    const actionsSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/stores/analysis/analysisStore.actions.ts",
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

    expect(actionsSource).toContain("getFactReviewQueue");
    expect(actionsSource).toContain("confirmFact");
    expect(actionsSource).toContain("rejectFact");
    expect(actionsSource).toContain("getEpisodeReviewQueue");
    expect(actionsSource).toContain("confirmEpisode");
    expect(actionsSource).toContain("rejectEpisode");
    expect(actionsSource).toContain("getEntityReviewQueue");
    expect(actionsSource).toContain("confirmEntity");
    expect(actionsSource).toContain("rejectEntity");
    expect(actionsSource).toContain("getEntityAliasReviewQueue");
    expect(actionsSource).toContain("confirmEntityAlias");
    expect(actionsSource).toContain("rejectEntityAlias");
    expect(actionsSource).toContain("splitEntityAlias");
    expect(actionsSource).toContain("mergeEntity");
    expect(actionsSource).toContain("getReviewBacklog");
    expect(actionsSource).toContain("reviewStaleEvidence");
    expect(actionsSource).toContain("repairEvidenceLinks");
    expect(queuesSource).toContain("handleReviewStaleEvidence");
    expect(queuesSource).toContain("handleRepairStaleEvidence");
    expect(queuesSource).toContain("requestRejectReason");

    expect(stalePanelSource).toContain("defer");
    expect(stalePanelSource).toContain("reject");
    expect(stalePanelSource).toContain("resolve");
    expect(stalePanelSource).toContain("repair");
  });
});
