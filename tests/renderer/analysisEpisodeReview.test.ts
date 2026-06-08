import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection episode review UI", () => {
  it("exposes suggested episode review and rejection actions", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/EpisodeReviewPanel.tsx",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("EpisodeReviewPanel");
    expect(analysisSource).toContain("getEpisodeReviewQueue");
    expect(analysisSource).toContain("rejectEpisode");
    expect(panelSource).toContain("검토할 에피소드");
    expect(panelSource).toContain("거절");
    expect(panelSource).toContain("evidenceCount");
  });
});
