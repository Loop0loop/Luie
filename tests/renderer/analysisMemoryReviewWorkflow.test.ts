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
        "src/renderer/src/features/research/components/analysisSection/useMemoryReviewQueues.ts",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("FactReviewPanel");
    expect(analysisSource).toContain("EpisodeReviewPanel");
    expect(analysisSource).toContain("EntityReviewPanel");
    expect(analysisSource).toContain("EntityAliasReviewPanel");

    expect(queuesSource).toContain("getFactReviewQueue");
    expect(queuesSource).toContain("confirmFact");
    expect(queuesSource).toContain("rejectFact");
    expect(queuesSource).toContain("getEpisodeReviewQueue");
    expect(queuesSource).toContain("confirmEpisode");
    expect(queuesSource).toContain("rejectEpisode");
    expect(queuesSource).toContain("getEntityReviewQueue");
    expect(queuesSource).toContain("confirmEntity");
    expect(queuesSource).toContain("rejectEntity");
    expect(queuesSource).toContain("getEntityAliasReviewQueue");
    expect(queuesSource).toContain("confirmEntityAlias");
    expect(queuesSource).toContain("rejectEntityAlias");
    expect(queuesSource).toContain("splitEntityAlias");
    expect(queuesSource).toContain("mergeEntity");
    expect(queuesSource).toContain("requestRejectReason");
    expect(queuesSource).toContain("reason,");
  });
});
